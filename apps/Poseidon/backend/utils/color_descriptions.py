import numpy as np
import cv2
from collections import Counter
from typing import List, Tuple


def rgb_to_hsl(r: int, g: int, b: int) -> Tuple[float, float, float]:
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d + (6 if g < b else 0)) / 6
    elif mx == g:
        h = ((b - r) / d + 2) / 6
    else:
        h = ((r - g) / d + 4) / 6
    return h * 360, s, l


def rgb_to_color_name(r: int, g: int, b: int) -> str:
    h, s, l = rgb_to_hsl(r, g, b)
    if l < 0.08:
        return "preto"
    if l > 0.92 and s < 0.08:
        return "branco"
    if s < 0.10:
        if l < 0.30:
            return "cinza escuro"
        if l < 0.65:
            return "cinza"
        return "cinza claro"
    if h < 15 or h >= 345:
        return "vermelho" if l >= 0.35 else "vermelho escuro"
    if h < 45:
        return "laranja" if l >= 0.35 else "marrom"
    if h < 70:
        return "amarelo" if s >= 0.4 else "bege"
    if h < 150:
        return "verde" if l >= 0.30 else "verde escuro"
    if h < 195:
        return "ciano" if l >= 0.30 else "ciano escuro"
    if h < 260:
        return "azul" if l >= 0.30 else "azul escuro"
    if h < 290:
        return "roxo" if l >= 0.30 else "roxo escuro"
    return "rosa" if l >= 0.30 else "rosa escuro"


def extract_dominant_colors(
    image: np.ndarray,
    top_n: int = 5,
    sample_step: int = 2,
    min_saturation: float = 0.0,
    min_lightness: float = 0.04,
    max_lightness: float = 0.96,
) -> List[Tuple[str, float, Tuple[int, int, int]]]:
    if image is None or image.size == 0:
        return []
    h_img, w_img = image.shape[:2]
    if h_img < 4 or w_img < 4:
        return []

    if len(image.shape) == 3 and image.shape[2] == 3:
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    else:
        rgb = image

    counter = Counter()
    total = 0
    for y in range(0, h_img, sample_step):
        for x in range(0, w_img, sample_step):
            r, g, b = int(rgb[y, x, 0]), int(rgb[y, x, 1]), int(rgb[y, x, 2])
            _, s, l = rgb_to_hsl(r, g, b)
            if l < min_lightness or (l > max_lightness and s < 0.06):
                continue
            if s < min_saturation and l < 0.25:
                continue
            name = rgb_to_color_name(r, g, b)
            counter[name] += 1
            total += 1

    if total == 0:
        return []

    result = []
    for name, count in counter.most_common(top_n):
        pct = round(count / total * 100, 1)
        if pct >= 1.0:
            result.append((name, pct, (0, 0, 0)))

    return result


def format_color_list(colors: List[Tuple[str, float, Tuple[int, int, int]]]) -> str:
    if not colors:
        return "sem cores detectadas"
    parts = [f"{name} {pct}%" for name, pct, _ in colors]
    return ", ".join(parts)


def describe_region_colors(image: np.ndarray, region_name: str = "") -> str:
    colors = extract_dominant_colors(image, top_n=5, sample_step=3)
    if not colors:
        return f"{region_name}: sem cores detectadas" if region_name else "sem cores detectadas"
    desc = format_color_list(colors)
    return f"{region_name}: {desc}" if region_name else desc


def describe_face(face_crop: np.ndarray) -> str:
    if face_crop is None or face_crop.size == 0:
        return "rosto nao detectado"

    h, w = face_crop.shape[:2]
    parts = []

    h_third = max(1, h // 3)

    hair_region = face_crop[:h_third, :]
    hair_colors = extract_dominant_colors(hair_region, top_n=2, sample_step=3, min_saturation=0.03)
    if hair_colors:
        hair_desc = ", ".join(f"{n} {p}%" for n, p, _ in hair_colors)
        parts.append(f"cabelo {hair_desc}")

    chin_region = face_crop[2 * h_third:, :]
    gray_chin = cv2.cvtColor(chin_region, cv2.COLOR_BGR2GRAY)
    dark_pixels = np.sum(gray_chin < 80)
    total_pixels = gray_chin.size
    if total_pixels > 0:
        beard_pct = round(dark_pixels / total_pixels * 100, 1)
        if beard_pct > 25:
            parts.append(f"barba ({beard_pct}%)")

    center_region = face_crop[h_third:2*h_third, w//4:3*w//4]
    avg_color = center_region.mean(axis=(0, 1)).astype(int)
    _, _, l = rgb_to_hsl(int(avg_color[2]), int(avg_color[1]), int(avg_color[0]))
    if l < 0.30:
        parts.append("pele escura")
    elif l < 0.50:
        parts.append("pele morena")
    elif l < 0.70:
        parts.append("pele morena clara")
    else:
        parts.append("pele clara")

    return "; ".join(parts) if parts else "rosto detectado sem detalhes"


def describe_pose_features(feature_vector: np.ndarray) -> str:
    if feature_vector is None or len(feature_vector) < 20:
        return "postura nao detectada"

    parts = []
    shoulder_w = feature_vector[0]
    hip_shoulder_ratio = feature_vector[2]
    knee_angle = feature_vector[3]
    elbow_angle = feature_vector[4]
    stance_ratio = feature_vector[6]
    torso_lean = feature_vector[7]

    if hip_shoulder_ratio > 0.85:
        parts.append("corpo largo")
    elif hip_shoulder_ratio > 0.7:
        parts.append("corpo proporcional")
    else:
        parts.append("corpo estreito")

    if knee_angle < 0.4:
        parts.append("pernas esticadas")
    elif knee_angle < 0.6:
        parts.append("joelhos semiflexionados")
    else:
        parts.append("agachado")

    if elbow_angle < 0.4:
        parts.append("bracos recolhidos")
    elif elbow_angle < 0.7:
        parts.append("bracos semi-estendidos")
    else:
        parts.append("bracos estendidos")

    if torso_lean > 0.6:
        parts.append("tronco inclinado")
    elif torso_lean > 0.3:
        parts.append("tronco levemente inclinado")

    if shoulder_w > 0.25:
        parts.append("ombros largos")
    elif shoulder_w < 0.15:
        parts.append("ombros estreitos")

    return "; ".join(parts) if parts else "postura detectada"
