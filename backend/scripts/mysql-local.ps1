# Starts the project-local MySQL 8 (no Docker, no admin rights) on port 3307.
# Needs MySQL Server 8.0 binaries installed; data lives in ./.mysql-data (git-ignored).
$bin = "C:\Program Files\MySQL\MySQL Server 8.0\bin"
$data = Join-Path $PSScriptRoot "..\.mysql-data" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $data) {
    $data = Join-Path $PSScriptRoot ".." | Resolve-Path
    $data = Join-Path $data ".mysql-data"
    New-Item -ItemType Directory $data | Out-Null
    & "$bin\mysqld.exe" --no-defaults --initialize-insecure "--datadir=$data"
}
Start-Process "$bin\mysqld.exe" -ArgumentList "--no-defaults", "--datadir=$data", "--innodb-undo-directory=$data", "--port=3307", "--bind-address=127.0.0.1", "--mysqlx=OFF" -WorkingDirectory $data -WindowStyle Hidden
Start-Sleep 10
& "$bin\mysql.exe" --no-defaults -u root --host=127.0.0.1 --port=3307 -e "CREATE DATABASE IF NOT EXISTS work_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS work_tracker_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"