# Запуск после: npx wrangler login
# Создай файл .dev.vars в корне проекта (он в .gitignore):
#
# YOOMONEY_NOTIFICATION_SECRET=твой_секрет_из_юmoney
# FIREBASE_DB_URL=https://rainclient-default-rtdb.firebaseio.com
# FIREBASE_DB_SECRET=твой_database_secret_из_firebase

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$devVars = Join-Path $root ".dev.vars"

if (-not (Test-Path $devVars)) {
    Write-Host "Создай файл .dev.vars по образцу .env.example" -ForegroundColor Yellow
    exit 1
}

Get-Content $devVars | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($name -and $value) {
            Write-Host "Setting $name ..."
            $value | npx wrangler pages secret put $name --project-name rainclien
        }
    }
}

Write-Host "Готово. Сделай Retry deployment в Cloudflare." -ForegroundColor Green
