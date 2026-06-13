import sys
import threading
import queue
import customtkinter as ctk
import os
import json
import unicodedata
from main import run_bot

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class PrintLogger:
    """Redirects stdout to a queue, tagging the message with the current thread name."""
    def __init__(self, log_queue):
        self.log_queue = log_queue

    def write(self, msg):
        # We append the thread name as a tuple: (ThreadName, Message)
        thread_name = threading.current_thread().name
        self.log_queue.put((thread_name, msg))

    def flush(self):
        pass

class App(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("🤖 Bot de Leads - Google Maps (Multi-Cidades)")
        self.geometry("800x650")
        self.resizable(False, False)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(4, weight=1)

        # Title
        self.title_label = ctk.CTkLabel(self, text="Extrator de Leads no Google Maps", font=ctk.CTkFont(size=20, weight="bold"))
        self.title_label.grid(row=0, column=0, padx=20, pady=(20, 10))

        # Input Frame
        self.input_frame = ctk.CTkFrame(self)
        self.input_frame.grid(row=1, column=0, padx=20, pady=10, sticky="ew")
        self.input_frame.grid_columnconfigure(1, weight=1)

        # Termo
        self.termo_label = ctk.CTkLabel(self.input_frame, text="Busca (Ex: Petshop):")
        self.termo_label.grid(row=0, column=0, padx=10, pady=10, sticky="w")
        self.termo_entry = ctk.CTkEntry(self.input_frame, placeholder_text="Digite o segmento")
        self.termo_entry.grid(row=0, column=1, padx=10, pady=10, sticky="ew")

        # Cidade(s)
        self.cidade_label = ctk.CTkLabel(self.input_frame, text="Cidades (separadas por vírgula):")
        self.cidade_label.grid(row=1, column=0, padx=10, pady=10, sticky="w")
        
        self.cidade_frame = ctk.CTkFrame(self.input_frame, fg_color="transparent")
        self.cidade_frame.grid(row=1, column=1, padx=10, pady=10, sticky="ew")
        self.cidade_frame.grid_columnconfigure(0, weight=1)
        
        self.cidade_entry = ctk.CTkEntry(self.cidade_frame, placeholder_text="Ex: Paulinia, Jundiai, Sumare")
        self.cidade_entry.grid(row=0, column=0, sticky="ew")
        
        self.add_city_btn = ctk.CTkButton(self.cidade_frame, text="+", width=30, command=self.open_city_catalog)
        self.add_city_btn.grid(row=0, column=1, padx=(5, 0))

        # Quantidade
        self.qtd_label = ctk.CTkLabel(self.input_frame, text="Qtd por Cidade:")
        self.qtd_label.grid(row=2, column=0, padx=10, pady=10, sticky="w")
        self.qtd_entry = ctk.CTkEntry(self.input_frame, placeholder_text="500")
        self.qtd_entry.insert(0, "500")
        self.qtd_entry.grid(row=2, column=1, padx=10, pady=10, sticky="w")

        # Start Button
        self.start_button = ctk.CTkButton(self, text="▶ Iniciar Extração Simultânea", command=self.start_scraping, font=ctk.CTkFont(weight="bold"))
        self.start_button.grid(row=2, column=0, padx=20, pady=10)

        # Log Tabview
        self.log_label = ctk.CTkLabel(self, text="Painel de Atividades Simultâneas:")
        self.log_label.grid(row=3, column=0, padx=20, pady=(10, 0), sticky="w")
        
        self.tabview = ctk.CTkTabview(self)
        self.tabview.grid(row=4, column=0, padx=20, pady=(5, 20), sticky="nsew")
        
        self.log_boxes = {} # dict mapping tab_name -> CTkTextbox
        self.active_threads = 0

        self.log_queue = queue.Queue()
        self.update_logs()
        
        # Original stdout
        self.original_stdout = sys.stdout

    def remove_city_from_json(self, cidade_alvo):
        if not cidade_alvo:
            return
        cidade_alvo_norm = unicodedata.normalize('NFD', cidade_alvo.lower().strip()).encode('ascii', 'ignore').decode('utf-8')
        json_path = os.path.join(os.path.dirname(__file__), "cidades_brasil.json")
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            modified = False
            for estado, cidades in data.items():
                for c in list(cidades):
                    c_norm = unicodedata.normalize('NFD', c.lower().strip()).encode('ascii', 'ignore').decode('utf-8')
                    if c_norm == cidade_alvo_norm:
                        cidades.remove(c)
                        modified = True
            
            if modified:
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                self.log_queue.put((cidade_alvo, f"✅ '{cidade_alvo}' removida do banco de cidades permanentemente.\n"))
        except Exception as e:
            self.log_queue.put((cidade_alvo, f"⚠️ Erro ao remover do JSON: {e}\n"))

    def open_city_catalog(self):
        catalog = ctk.CTkToplevel(self)
        catalog.title("Catálogo de Cidades")
        catalog.geometry("400x550")
        catalog.transient(self)
        catalog.grab_set()

        search_entry = ctk.CTkEntry(catalog, placeholder_text="Pesquisar cidade ou estado...")
        search_entry.pack(fill="x", padx=10, pady=10)

        scroll_frame = ctk.CTkScrollableFrame(catalog)
        scroll_frame.pack(fill="both", expand=True, padx=10, pady=5)
        
        finish_btn = ctk.CTkButton(catalog, text="Concluir e Fechar", command=catalog.destroy, fg_color="#28a745", hover_color="#218838")
        finish_btn.pack(pady=10)
        
        json_path = os.path.join(os.path.dirname(__file__), "cidades_brasil.json")
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                city_data = json.load(f)
        except:
            city_data = {}

        all_cities = []
        for state, cities in city_data.items():
            for c in cities:
                all_cities.append(f"{c} - {state}")
                
        def toggle_city(btn, city_str):
            city_name = city_str.split(" - ")[0]
            current = self.cidade_entry.get().strip()
            
            cidades_atuais = [x.strip() for x in current.split(",")] if current else []
            
            if city_name in cidades_atuais:
                # Remove
                cidades_atuais.remove(city_name)
                btn.configure(text=city_str, text_color=("gray10", "gray90")) # Default CTk color
            else:
                # Add
                cidades_atuais.append(city_name)
                btn.configure(text=f"{city_str}  ✔", text_color="#00FF00")
                
            # Update input field
            self.cidade_entry.delete(0, "end")
            self.cidade_entry.insert(0, ", ".join(cidades_atuais))

        def update_list(*args):
            query = search_entry.get().lower()
            for widget in scroll_frame.winfo_children():
                widget.destroy()
                
            current = self.cidade_entry.get().strip()
            cidades_atuais = [x.strip() for x in current.split(",")] if current else []

            count = 0
            for c in all_cities:
                if query in c.lower() or query == "":
                    city_name = c.split(" - ")[0]
                    is_selected = city_name in cidades_atuais
                    
                    display_text = f"{c}  ✔" if is_selected else c
                    
                    btn = ctk.CTkButton(scroll_frame, text=display_text, anchor="w", fg_color="transparent", hover_color="#333333")
                    if is_selected:
                        btn.configure(text_color="#00FF00")
                        
                    btn.configure(command=lambda b=btn, c_name=c: toggle_city(b, c_name))
                    btn.pack(fill="x", pady=2)
                    count += 1
                    if count > 150: # Limit results
                        break

        search_entry.bind("<KeyRelease>", update_list)
        update_list()

    def create_tab_for(self, name):
        """Creates a new tab and textbox if it doesn't exist."""
        if name not in self.log_boxes:
            self.tabview.add(name)
            textbox = ctk.CTkTextbox(self.tabview.tab(name), state="disabled", wrap="word", fg_color="black", text_color="#00FF00", font=("Consolas", 12))
            textbox.pack(expand=True, fill="both", padx=5, pady=5)
            self.log_boxes[name] = textbox

    def update_logs(self):
        """Consume messages from the queue and print them in the corresponding textbox."""
        while not self.log_queue.empty():
            thread_name, msg = self.log_queue.get_nowait()
            
            # Use specific tab or MainMessage tab
            target_tab = thread_name if thread_name in self.log_boxes else "Geral"
            self.create_tab_for(target_tab)

            textbox = self.log_boxes[target_tab]
            textbox.configure(state="normal")
            textbox.insert("end", msg)
            textbox.see("end")  # Auto-scroll
            textbox.configure(state="disabled")
            
        self.after(50, self.update_logs)

    def start_scraping(self):
        termo = self.termo_entry.get().strip()
        cidades_raw = self.cidade_entry.get().strip()
        qtd_str = self.qtd_entry.get().strip()
        
        if not termo:
            # Send an error to a global tab
            sys.stdout = self.original_stdout
            self.create_tab_for("Geral")
            self.log_queue.put(("Geral", "❌ Erro: O termo de busca é obrigatório!\n"))
            return

        cidades = [c.strip() for c in cidades_raw.split(",")] if cidades_raw else [""]

        try:
            qtd = int(qtd_str) if qtd_str else 500
        except ValueError:
            qtd = 500

        self.start_button.configure(state="disabled", text="⏳ Extraindo...")
        
        # Clear existing tabs
        for tab_name in list(self.log_boxes.keys()):
            self.tabview.delete(tab_name)
        self.log_boxes.clear()

        # Roteador de Logs
        sys.stdout = PrintLogger(self.log_queue)
        
        self.active_threads = len(cidades)
        
        for cidade in cidades:
            tab_name = cidade if cidade else "Geral"
            self.create_tab_for(tab_name)
            
            self.log_queue.put((tab_name, f"Iniciando thread para: {tab_name}...\n"))
            
            # Start Thread with specific name matching the tab
            thread = threading.Thread(target=self.run_bot_thread, args=(termo, cidade, qtd), name=tab_name)
            thread.daemon = True
            thread.start()

    def run_bot_thread(self, termo, cidade, qtd):
        thread_name = threading.current_thread().name
        try:
            run_bot(termo, cidade, qtd)
            self.remove_city_from_json(cidade)
        except Exception as e:
            print(f"\n❌ Erro durante a execução: {e}")
        finally:
            self.log_queue.put((thread_name, "\n✅ Processo finalizado para esta região.\n"))
            self.check_threads_done()

    def check_threads_done(self):
        """Called safely when a thread finishes. Decrements active counter."""
        self.active_threads -= 1
        if self.active_threads <= 0:
            # Restore button
            self.start_button.configure(state="normal", text="▶ Iniciar Extração Simultânea")
            sys.stdout = self.original_stdout

if __name__ == "__main__":
    app = App()
    app.mainloop()
