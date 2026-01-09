"""
Cleanup Script for AI Music Studio
Removes old generated files to free up disk space
"""

import os
import json
import shutil
from pathlib import Path
from datetime import datetime, timedelta

# Configuration
OUTPUT_ROOT = Path(__file__).parent / "outputs"
HISTORY_FILE = OUTPUT_ROOT / "history.json"
DAYS_TO_KEEP = 7  # Keep files from last 7 days
DRY_RUN = False  # Set to True to see what would be deleted without actually deleting


def get_folder_size(folder):
    """Calculate total size of a folder in MB"""
    total = 0
    try:
        for entry in os.scandir(folder):
            if entry.is_file():
                total += entry.stat().st_size
            elif entry.is_dir():
                total += get_folder_size(entry.path)
    except Exception as e:
        print(f"Error calculating size for {folder}: {e}")
    return total / (1024 * 1024)  # Convert to MB


def cleanup_old_files():
    """Remove files older than DAYS_TO_KEEP"""
    if not OUTPUT_ROOT.exists():
        print(f"Output directory does not exist: {OUTPUT_ROOT}")
        return

    cutoff_date = datetime.now() - timedelta(days=DAYS_TO_KEEP)
    deleted_count = 0
    freed_space = 0

    print(f"🧹 Cleanup started...")
    print(f"📁 Scanning: {OUTPUT_ROOT}")
    print(f"📅 Removing files older than: {cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔧 Dry run: {DRY_RUN}")
    print("-" * 60)

    # Get list of task folders
    task_folders = [f for f in OUTPUT_ROOT.iterdir() if f.is_dir() and f.name != "__pycache__"]

    for task_folder in task_folders:
        try:
            # Get folder modification time
            folder_mtime = datetime.fromtimestamp(task_folder.stat().st_mtime)

            if folder_mtime < cutoff_date:
                folder_size = get_folder_size(task_folder)
                
                if DRY_RUN:
                    print(f"[DRY RUN] Would delete: {task_folder.name} ({folder_size:.2f} MB)")
                else:
                    shutil.rmtree(task_folder)
                    print(f"✅ Deleted: {task_folder.name} ({folder_size:.2f} MB)")
                
                deleted_count += 1
                freed_space += folder_size

        except Exception as e:
            print(f"❌ Error processing {task_folder.name}: {e}")

    print("-" * 60)
    print(f"📊 Summary:")
    print(f"   • Folders deleted: {deleted_count}")
    print(f"   • Space freed: {freed_space:.2f} MB")
    
    if DRY_RUN:
        print(f"\n⚠️  This was a DRY RUN. No files were actually deleted.")
        print(f"   Set DRY_RUN = False to perform actual cleanup.")


def cleanup_history():
    """Remove old entries from history.json"""
    if not HISTORY_FILE.exists():
        print("No history file found.")
        return

    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            history = json.load(f)

        original_count = len(history)
        cutoff_date = datetime.now() - timedelta(days=DAYS_TO_KEEP)

        # Filter history entries
        cleaned_history = []
        for entry in history:
            try:
                created_at = datetime.fromisoformat(entry.get('created_at', ''))
                if created_at >= cutoff_date:
                    cleaned_history.append(entry)
            except:
                # Keep entries with invalid dates
                cleaned_history.append(entry)

        removed_count = original_count - len(cleaned_history)

        if removed_count > 0:
            if DRY_RUN:
                print(f"[DRY RUN] Would remove {removed_count} old history entries")
            else:
                with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
                    json.dump(cleaned_history, f, indent=2)
                print(f"✅ Removed {removed_count} old history entries")
        else:
            print("No old history entries to remove")

    except Exception as e:
        print(f"❌ Error cleaning history: {e}")


def show_disk_usage():
    """Show current disk usage"""
    if not OUTPUT_ROOT.exists():
        return

    total_size = get_folder_size(OUTPUT_ROOT)
    folder_count = len([f for f in OUTPUT_ROOT.iterdir() if f.is_dir() and f.name != "__pycache__"])

    print("\n💾 Current Disk Usage:")
    print(f"   • Total size: {total_size:.2f} MB")
    print(f"   • Task folders: {folder_count}")
    
    # Get disk space
    try:
        total, used, free = shutil.disk_usage(OUTPUT_ROOT)
        free_gb = free // (2**30)
        print(f"   • Free disk space: {free_gb} GB")
    except:
        pass


if __name__ == "__main__":
    print("=" * 60)
    print("🎵 AI Music Studio - Cleanup Script")
    print("=" * 60)
    
    show_disk_usage()
    print()
    cleanup_old_files()
    print()
    cleanup_history()
    print()
    show_disk_usage()
    
    print("\n✨ Cleanup complete!")
