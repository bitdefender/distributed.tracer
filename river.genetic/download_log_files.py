import os
import urllib 


def create_directory(name):
    path = os.path.join('.', name)
    if not os.path.exists(path):
        os.makedirs(path)


def download_logs(logs_dir_name, name):
    logs_path = os.path.join('.', logs_dir_name)
    if not os.path.exists(logs_path):
        os.makedirs(logs_path)

    log_file_url = ""

    complete_logs_path = os.path.join(logs_path, name)
    urllib.urlretrieve(log_file_url, complete_logs_path)


def main():
    logs_directory_name = "logs"
    create_directory(logs_directory_name)

    log_file_name = "log.txt"
    # download_logs(logs_directory_name, log_file_name)


if __name__ == "__main__":
    main()

