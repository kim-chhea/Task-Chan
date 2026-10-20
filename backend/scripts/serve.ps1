# Dev server with upload limits from php.ini (12M). Herd's php.ini defaults to 2M.
# Uses PHP's built-in server directly so -c applies to the request-handling process.
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root
Set-Location "$root\public"; New-Item -ItemType Directory -Force "$root\storage\app\tmp" | Out-Null
$env:PHP_CLI_SERVER_WORKERS = "4"
php -c "$root\php.ini" -d "upload_tmp_dir=$root\storage\app\tmp" `
    -S 127.0.0.1:8000 -t "$root\public" "$root\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"