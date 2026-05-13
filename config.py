from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "outputs"
CSV_DIR = OUTPUT_DIR / "csv"
FIGURE_DIR = OUTPUT_DIR / "figures"
REPORT_DIR = OUTPUT_DIR / "reports"

MAX_STEPS = 5000
DOWNSAMPLE_TARGET = 400   # max points sent to browser per series
