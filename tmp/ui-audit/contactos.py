import json
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
data = json.loads((root / 'tmp/ui-audit/barrido-data.json').read_text(encoding='utf-8'))
shots = list(dict.fromkeys(item['shot'] for item in data['states']))
folder = root / 'tmp/ui-audit/contactos'
folder.mkdir(parents=True, exist_ok=True)
for start in range(0, len(shots), 16):
    sheet = Image.new('RGB', (1280, 1160), '#e6eceb')
    draw = ImageDraw.Draw(sheet)
    for offset, rel in enumerate(shots[start:start+16]):
        x = (offset % 4) * 320
        y = (offset // 4) * 290
        image = Image.open(root / rel).convert('RGB')
        image.thumbnail((304, 260))
        sheet.paste(image, (x + (320-image.width)//2, y+24))
        label = Path(rel).stem.replace('ui-', '')[:43]
        draw.text((x+8,y+4), label, fill='#142c31')
    sheet.save(folder / f'contacto-{start//16+1:02d}.jpg', quality=85)
print(len(shots), 'capturas en', (len(shots)+15)//16, 'hojas')
