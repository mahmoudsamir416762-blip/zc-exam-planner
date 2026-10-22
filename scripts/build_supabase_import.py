"""Turn the private extracted students.json into a Supabase import CSV.

This script is safe to publish; the source JSON and generated CSV are not.
Example:
  python scripts/build_supabase_import.py --students /secure/students.json --out /secure/student_course_rooms.csv
"""
import argparse
import csv
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--students", required=True, type=Path)
parser.add_argument("--out", required=True, type=Path)
args = parser.parse_args()

students = json.loads(args.students.read_text(encoding="utf-8"))
with args.out.open("w", newline="", encoding="utf-8") as output:
    writer = csv.DictWriter(output, fieldnames=["student_id", "course_code", "room"])
    writer.writeheader()
    for student_id, records in students.items():
        for record in records:
            writer.writerow({"student_id": student_id, "course_code": record["code"], "room": record["room"]})
print(f"Wrote {args.out}")
