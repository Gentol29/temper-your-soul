<#
.SYNOPSIS
  Prepara ComfyUI in locale (Windows, GPU NVIDIA) per generare gli sprite del gioco.

.DESCRIPTION
  Senza parametri NON scarica nulla: stampa cosa farebbe (file, origine, dimensione).
  Con -Scarica esegue davvero: ComfyUI portatile + modelli + nodo tile_circolare.
  Tutto finisce FUORI dal repository, in -Radice (default: Downloads\PixelArt-AI),
  la stessa posizione che gli script di tools/arte si aspettano.
  Nessun token e nessun account: i modelli sono pubblici e girano sulla tua GPU.

.EXAMPLE
  .\tools\arte\comfyui\installa-comfyui.ps1            # solo elenco
  .\tools\arte\comfyui\installa-comfyui.ps1 -Scarica   # installa
#>
param(
  [string]$Radice = (Join-Path $env:USERPROFILE "Downloads\PixelArt-AI"),
  [switch]$Scarica
)

$ErrorActionPreference = "Stop"
$qui = Split-Path -Parent $MyInvocation.MyCommand.Path

# Versione dei file: ComfyUI portatile (Python incluso, non serve installare Python).
$elementi = @(
  @{ Nome = "ComfyUI portatile (NVIDIA)"; Dim = "~2 GB";
     Url = "https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z";
     Dest = Join-Path $Radice "ComfyUI_windows_portable_nvidia.7z"; Tipo = "archivio" },
  @{ Nome = "SDXL base 1.0 (OpenRAIL++-M)"; Dim = "~6.9 GB";
     Url = "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors";
     Dest = "checkpoints\sd_xl_base_1.0.safetensors"; Tipo = "modello" },
  @{ Nome = "VAE SDXL fp16-fix"; Dim = "~335 MB";
     Url = "https://huggingface.co/madebyollin/sdxl-vae-fp16-fix/resolve/main/sdxl.vae.safetensors";
     Dest = "vae\sdxl-vae-fp16-fix.safetensors"; Tipo = "modello" },
  @{ Nome = "LoRA Pixel Art XL (nerijs, OpenRAIL-M)"; Dim = "~170 MB";
     Url = "https://huggingface.co/nerijs/pixel-art-xl/resolve/main/pixel-art-xl.safetensors";
     Dest = "loras\pixel-art-xl.safetensors"; Tipo = "modello" }
)

Write-Host "Cartella di destinazione: $Radice"
Write-Host "Spazio libero su C: $([math]::Round((Get-PSDrive C).Free/1GB)) GB (ne servono ~12)"
$elementi | ForEach-Object { Write-Host (" - {0,-42} {1,8}  {2}" -f $_.Nome, $_.Dim, $_.Url) }

if (-not $Scarica) {
  Write-Host "`nNiente scaricato. Rilancia con -Scarica per installare."
  return
}

$sette = "C:\Program Files\7-Zip\7z.exe"
if (-not (Test-Path $sette)) { throw "Serve 7-Zip (winget install 7zip.7zip)." }
New-Item -ItemType Directory -Force $Radice, (Join-Path $Radice "immagini") | Out-Null

function Scarica-File($url, $dest) {
  if (Test-Path $dest) { Write-Host "  gia' presente: $dest"; return }
  New-Item -ItemType Directory -Force (Split-Path $dest) | Out-Null
  $parziale = "$dest.parziale"
  # curl.exe riprende i download interrotti (-C -) e mostra l'avanzamento.
  & curl.exe -L --fail -C - -o $parziale $url
  if ($LASTEXITCODE -ne 0) { throw "Download fallito: $url" }
  Move-Item $parziale $dest
}

# 1) ComfyUI portatile
$arch = $elementi[0].Dest
$cartella = Join-Path $Radice "ComfyUI_windows_portable"
if (-not (Test-Path $cartella)) {
  Write-Host "`n[1/4] $($elementi[0].Nome)"
  Scarica-File $elementi[0].Url $arch
  & $sette x $arch "-o$Radice" -y | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Estrazione fallita." }
}
$modelli = Join-Path $cartella "ComfyUI\models"

# 2) Modelli
$i = 2
foreach ($m in $elementi | Where-Object { $_.Tipo -eq "modello" }) {
  Write-Host "`n[$i/4] $($m.Nome)"
  Scarica-File $m.Url (Join-Path $modelli $m.Dest)
  $i++
}

# 3) Nodo scritto per il progetto (padding circolare), non scaricato.
$nodi = Join-Path $cartella "ComfyUI\custom_nodes"
Copy-Item (Join-Path $qui "tile_circolare.py") $nodi -Force

# 4) Avvio: ComfyUI in ascolto solo su questo PC, uscite fuori dal repository.
$avvio = Join-Path $Radice "avvia-comfyui.bat"
@"
@echo off
set PIXELART_AI_IMMAGINI=$Radice\immagini
cd /d "$cartella"
python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --listen 127.0.0.1 --port 8188 --output-directory "$Radice\immagini" --lowvram
pause
"@ | Set-Content -Encoding ASCII $avvio

Write-Host "`nFatto. Avvia con: $avvio  (poi apri http://127.0.0.1:8188)"
Write-Host "Esporta le immagini con:  `$env:PIXELART_AI_IMMAGINI = '$Radice\immagini'"
