# utils/human_behavior.py

import time
import random
import math
from playwright.sync_api import Page


def delay(min_s: float = 2.0, max_s: float = 6.0):
    """Pausa aleatória para simular comportamento humano."""
    t = random.uniform(min_s, max_s)
    time.sleep(t)


def human_type(page: Page, selector: str, text: str):
    """Digita texto caractere por caractere com velocidade variável."""
    page.click(selector)
    delay(0.3, 0.8)
    for char in text:
        page.type(selector, char, delay=random.randint(80, 220))
        # Ocasionalmente faz uma pausa maior como humano pensando
        if random.random() < 0.05:
            delay(0.4, 1.2)


def human_scroll(page: Page, times: int = 3):
    """Rola a página de forma orgânica, não em blocos uniformes."""
    for _ in range(times):
        scroll_amount = random.randint(300, 700)
        page.mouse.wheel(0, scroll_amount)
        delay(1.0, 2.5)


def move_mouse_randomly(page: Page):
    """Move o mouse para posições aleatórias antes de clicar."""
    viewport = page.viewport_size
    if not viewport:
        return
    x = random.randint(100, viewport["width"] - 100)
    y = random.randint(100, viewport["height"] - 100)
    page.mouse.move(x, y)
    delay(0.2, 0.6)


def jitter_click(page: Page, element):
    """Clica com leve variação de posição, como um humano."""
    box = element.bounding_box()
    if not box:
        element.click()
        return
    # Clica dentro da área do elemento com pequena variação
    x = box["x"] + box["width"] * random.uniform(0.3, 0.7)
    y = box["y"] + box["height"] * random.uniform(0.3, 0.7)
    move_mouse_randomly(page)
    page.mouse.click(x, y)
    delay(0.3, 0.9)


def bezier_curve_points(start, end, steps=20):
    """Gera pontos de curva de Bezier para movimento suave do mouse."""
    control1 = (
        start[0] + random.randint(-100, 100),
        start[1] + random.randint(-100, 100)
    )
    control2 = (
        end[0] + random.randint(-100, 100),
        end[1] + random.randint(-100, 100)
    )
    points = []
    for i in range(steps + 1):
        t = i / steps
        x = (
            (1 - t) ** 3 * start[0]
            + 3 * (1 - t) ** 2 * t * control1[0]
            + 3 * (1 - t) * t ** 2 * control2[0]
            + t ** 3 * end[0]
        )
        y = (
            (1 - t) ** 3 * start[1]
            + 3 * (1 - t) ** 2 * t * control1[1]
            + 3 * (1 - t) * t ** 2 * control2[1]
            + t ** 3 * end[1]
        )
        points.append((x, y))
    return points


def smooth_mouse_move(page: Page, target_x: float, target_y: float):
    """Move o mouse suavemente com curva de Bezier."""
    current = page.evaluate("() => ({ x: window.mouseX || 0, y: window.mouseY || 0 })")
    start = (current.get("x", 0), current.get("y", 0))
    end = (target_x, target_y)
    points = bezier_curve_points(start, end)
    for px, py in points:
        page.mouse.move(px, py)
        time.sleep(random.uniform(0.005, 0.015))
