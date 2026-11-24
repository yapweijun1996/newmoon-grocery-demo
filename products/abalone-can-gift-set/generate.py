"""Rebuild this SKU: blender -b --python products/abalone-can-gift-set/generate.py"""
from pathlib import Path
import sys

folder = Path(__file__).resolve().parent
sys.path.insert(0, str(folder.parent))
from studio import build

build(folder.name)
