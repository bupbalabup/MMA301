param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

Add-Type -AssemblyName System.Drawing

$brandingDir = Join-Path $ProjectRoot 'src/assets/branding'
$iconsDir = Join-Path $ProjectRoot 'src/assets/icons'
$illustrationsDir = Join-Path $ProjectRoot 'src/assets/illustrations'
$navy = [System.Drawing.ColorTranslator]::FromHtml('#0F172A')
$blue = [System.Drawing.ColorTranslator]::FromHtml('#1D6FEB')
$cyan = [System.Drawing.ColorTranslator]::FromHtml('#35C8C3')
$surface = [System.Drawing.ColorTranslator]::FromHtml('#F4F6FA')
$muted = [System.Drawing.ColorTranslator]::FromHtml('#94A3B8')
$danger = [System.Drawing.ColorTranslator]::FromHtml('#DC2626')
$white = [System.Drawing.Color]::White
$transparent = [System.Drawing.Color]::Transparent

function New-Bitmap([int]$Width, [int]$Height, [System.Drawing.Color]$Background) {
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear($Background)
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Bitmap($Canvas, [string]$Path) {
  $Canvas.Graphics.Dispose()
  $Canvas.Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Canvas.Bitmap.Dispose()
}

function New-RoundedRect([float]$X, [float]$Y, [float]$Width, [float]$Height, [float]$Radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Pen([System.Drawing.Color]$Color, [float]$Width) {
  $pen = New-Object System.Drawing.Pen $Color, $Width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function Draw-BrandMark($Graphics, [float]$X, [float]$Y, [float]$Size, [bool]$Monochrome, [System.Drawing.Color]$MonoColor) {
  $state = $Graphics.Save()
  $Graphics.TranslateTransform($X, $Y)
  $Graphics.ScaleTransform($Size / 256, $Size / 256)
  $mainColor = if ($Monochrome) { $MonoColor } else { $blue }
  $accentColor = if ($Monochrome) { $MonoColor } else { $cyan }
  $outlineColor = if ($Monochrome) { $MonoColor } else { $navy }
  $detailColor = if ($Monochrome) { $MonoColor } else { $white }

  $accentPen = New-Pen $accentColor 14
  $Graphics.DrawBezier($accentPen, 28, 70, 52, 70, 60, 60, 80, 52)
  $Graphics.DrawBezier($accentPen, 176, 204, 190, 178, 207, 182, 229, 182)
  $accentPen.Dispose()
  $accentBrush = New-Object System.Drawing.SolidBrush $accentColor
  $Graphics.FillEllipse($accentBrush, 14, 57, 26, 26)
  $Graphics.FillEllipse($accentBrush, 216, 169, 26, 26)

  $bodyPath = New-RoundedRect 70 28 116 200 34
  if (-not $Monochrome) {
    $bodyBrush = New-Object System.Drawing.SolidBrush $mainColor
    $Graphics.FillPath($bodyBrush, $bodyPath)
    $bodyBrush.Dispose()
  }
  $outlinePen = New-Pen $outlineColor 12
  $Graphics.DrawPath($outlinePen, $bodyPath)
  $outlinePen.Dispose()
  $bodyPath.Dispose()

  $detailPen = New-Pen $detailColor 12
  $route = New-Object System.Drawing.Drawing2D.GraphicsPath
  $route.AddBezier(99,128,99,106,113,91,131,91)
  $route.AddBezier(131,91,151,91,162,106,162,125)
  $route.AddBezier(162,125,162,150,131,173,131,173)
  $route.AddBezier(131,173,131,173,99,150,99,128)
  $Graphics.DrawPath($detailPen, $route)
  $route.Dispose()
  $Graphics.DrawLine($detailPen, 111, 55, 151, 55)
  $detailPen.Dispose()
  $centerBrush = New-Object System.Drawing.SolidBrush $accentColor
  $Graphics.FillEllipse($centerBrush, 121, 114, 20, 20)
  $centerBrush.Dispose()
  $accentBrush.Dispose()
  $Graphics.Restore($state)
}

function Export-Branding {
  $canvas = New-Bitmap 1024 1024 $navy
  Draw-BrandMark $canvas.Graphics 154 154 716 $false $white
  Save-Bitmap $canvas (Join-Path $brandingDir 'app-icon.png')

  $canvas = New-Bitmap 1024 1024 $transparent
  Draw-BrandMark $canvas.Graphics 184 184 656 $false $white
  Save-Bitmap $canvas (Join-Path $brandingDir 'adaptive-icon-foreground.png')

  $canvas = New-Bitmap 1024 1024 $surface
  Save-Bitmap $canvas (Join-Path $brandingDir 'adaptive-icon-background.png')

  $canvas = New-Bitmap 512 512 $transparent
  Draw-BrandMark $canvas.Graphics 64 64 384 $false $white
  Save-Bitmap $canvas (Join-Path $brandingDir 'logo-symbol.png')

  $canvas = New-Bitmap 1200 320 $transparent
  Draw-BrandMark $canvas.Graphics 32 32 256 $false $white
  $font = New-Object System.Drawing.Font 'Arial', 78, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush $navy
  $canvas.Graphics.DrawString('Track Device', $font, $brush, 330, 103)
  $font.Dispose(); $brush.Dispose()
  Save-Bitmap $canvas (Join-Path $brandingDir 'logo-horizontal.png')

  $canvas = New-Bitmap 512 512 $transparent
  Draw-BrandMark $canvas.Graphics 64 64 384 $true $white
  Save-Bitmap $canvas (Join-Path $brandingDir 'logo-mono-light.png')

  $canvas = New-Bitmap 512 512 $transparent
  Draw-BrandMark $canvas.Graphics 64 64 384 $true $navy
  Save-Bitmap $canvas (Join-Path $brandingDir 'logo-mono-dark.png')

  $canvas = New-Bitmap 768 768 $transparent
  Draw-BrandMark $canvas.Graphics 224 100 320 $false $white
  $font = New-Object System.Drawing.Font 'Arial', 62, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush $navy
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $canvas.Graphics.DrawString('Track Device', $font, $brush, (New-Object System.Drawing.RectangleF 84, 470, 600, 100), $format)
  $font.Dispose(); $brush.Dispose(); $format.Dispose()
  Save-Bitmap $canvas (Join-Path $brandingDir 'splash-logo.png')

  $canvas = New-Bitmap 64 64 $navy
  Draw-BrandMark $canvas.Graphics 10 10 44 $false $white
  Save-Bitmap $canvas (Join-Path $brandingDir 'favicon.png')
}

function Export-NotificationForegroundIcon {
  $canvas = New-Bitmap 96 96 $transparent
  $pen = New-Pen $white 7
  $brush = New-Object System.Drawing.SolidBrush $white
  $canvas.Graphics.DrawLine($pen, 28, 60, 42, 44)
  $canvas.Graphics.DrawLine($pen, 42, 44, 60, 54)
  $canvas.Graphics.FillEllipse($brush, 20, 52, 16, 16)
  $canvas.Graphics.FillEllipse($brush, 34, 36, 16, 16)
  $canvas.Graphics.FillEllipse($brush, 52, 46, 16, 16)
  $canvas.Graphics.DrawEllipse($pen, 30, 18, 36, 36)
  $canvas.Graphics.FillEllipse($brush, 42, 30, 12, 12)
  $pen.Dispose()
  $brush.Dispose()
  Save-Bitmap $canvas (Join-Path $brandingDir 'notification-foreground-icon.png')
}

function Draw-Glyph([string]$Name, [System.Drawing.Graphics]$Graphics) {
  $pen = New-Pen $navy 6
  $accentPen = New-Pen $blue 6
  $brush = New-Object System.Drawing.SolidBrush $navy
  $accentBrush = New-Object System.Drawing.SolidBrush $blue
  function L($x1,$y1,$x2,$y2,$p=$pen) { $Graphics.DrawLine($p,$x1,$y1,$x2,$y2) }
  function E($x,$y,$w,$h,$p=$pen) { $Graphics.DrawEllipse($p,$x,$y,$w,$h) }
  function F($x,$y,$w,$h,$b=$accentBrush) { $Graphics.FillEllipse($b,$x,$y,$w,$h) }
  function Rect($x,$y,$w,$h,$p=$pen) { $Graphics.DrawRectangle($p,$x,$y,$w,$h) }
  function A($x,$y,$w,$h,$start,$sweep,$p=$pen) { $Graphics.DrawArc($p,$x,$y,$w,$h,$start,$sweep) }

  switch ($Name) {
    'dashboard' { Rect 19 19 24 24; Rect 53 19 24 24; Rect 19 53 24 24; Rect 53 53 24 24 }
    'live-map' { E 27 20 42 42 $accentPen; F 42 35 12 12; L 18 72 38 58; L 38 58 58 73; L 58 73 78 56 }
    'device' { Rect 27 12 42 72; L 40 23 56 23; F 44 70 8 8 }
    'history' { A 18 18 60 60 35 300; L 21 18 21 37; L 21 18 40 18; L 48 31 48 50; L 48 50 62 59 }
    'settings' { E 31 31 34 34; E 42 42 12 12 $accentPen; L 48 15 48 28; L 48 68 48 81; L 15 48 28 48; L 68 48 81 48; L 24 24 33 33; L 63 63 72 72; L 72 24 63 33; L 33 63 24 72 }
    'location' { E 25 18 46 46 $accentPen; F 41 34 14 14; L 48 64 48 82 }
    'movement' { F 14 62 12 12; F 70 19 12 12; L 25 66 40 50 $accentPen; L 40 50 55 58 $accentPen; L 55 58 73 29 $accentPen }
    'parking' { Rect 23 15 50 66; L 38 72 38 28 $accentPen; A 38 25 25 26 270 180 $accentPen }
    'speed' { A 17 23 62 62 190 160; L 48 59 67 37 $accentPen; F 42 53 12 12 }
    'max-speed' { A 17 30 62 55 190 160; L 48 63 69 41 $accentPen; L 24 17 72 17; L 64 9 72 17; L 64 25 72 17 }
    'stopped-duration' { E 17 17 62 62; L 48 17 48 8; L 38 8 58 8; L 39 37 39 59 $accentPen; L 57 37 57 59 $accentPen }
    'distance' { F 12 58 14 14; F 70 22 14 14; L 25 64 39 46 $accentPen; L 39 46 55 54 $accentPen; L 55 54 73 31 $accentPen }
    'last-update' { E 24 24 48 48; L 48 36 48 50; L 48 50 60 57; A 14 14 68 68 215 250 $accentPen; L 13 30 14 14 $accentPen; L 14 14 30 14 $accentPen }
    'coordinates' { E 23 23 50 50; E 39 39 18 18 $accentPen; L 48 10 48 27; L 48 69 48 86; L 10 48 27 48; L 69 48 86 48 }
    'online' { F 42 66 12 12; A 28 40 40 38 205 130 $accentPen; A 16 26 64 58 205 130 $accentPen }
    'lost-connection' { F 42 66 12 12; A 28 40 40 38 205 130; A 16 26 64 58 205 130; L 19 18 77 78 $accentPen }
    'offline-data' { E 20 18 56 18; L 20 27 20 68; L 76 27 76 68; A 20 57 56 20 0 180; L 18 17 78 79 $accentPen }
    'sync' { A 18 18 60 60 210 220; L 16 31 18 18; L 18 18 31 18; A 18 18 60 60 30 220 $accentPen; L 78 65 78 78 $accentPen; L 65 78 78 78 $accentPen }
    'pending-sync' { A 15 15 66 66 210 220; L 13 29 15 15; L 15 15 29 15; E 49 49 34 34 $accentPen; L 66 57 66 68 $accentPen; L 66 68 74 72 $accentPen }
    'retry' { A 18 18 60 60 35 285 $accentPen; L 70 16 78 30 $accentPen; L 78 30 62 31 $accentPen }
    'permission' { $path=New-Object System.Drawing.Drawing2D.GraphicsPath; $path.AddLines([System.Drawing.Point[]]@((New-Object System.Drawing.Point 48,12),(New-Object System.Drawing.Point 75,23),(New-Object System.Drawing.Point 71,58),(New-Object System.Drawing.Point 48,82),(New-Object System.Drawing.Point 25,58),(New-Object System.Drawing.Point 21,23))); $path.CloseFigure(); $Graphics.DrawPath($pen,$path); $path.Dispose(); L 34 48 44 58 $accentPen; L 44 58 64 36 $accentPen }
    'foreground-location' { Rect 25 10 46 76; E 34 28 28 28 $accentPen; F 43 37 10 10 }
    'background-location' { Rect 18 18 44 62; Rect 34 10 44 62 $accentPen; E 45 27 22 22 $accentPen; F 52 34 8 8 }
    'auto-start' { Rect 18 30 48 48; L 48 63 48 16 $accentPen; L 35 29 48 16 $accentPen; L 61 29 48 16 $accentPen; L 69 38 80 27 }
    'battery-optimization' { Rect 15 25 62 46; Rect 77 39 6 18; L 51 31 37 51 $accentPen; L 37 51 52 51 $accentPen; L 52 51 43 66 $accentPen }
    'notification' { A 24 17 48 55 180 180; L 24 44 20 69; L 20 69 76 69; L 76 69 72 44; A 40 68 16 16 0 180 $accentPen }
    'back' { L 73 48 23 48 $accentPen; L 23 48 42 29 $accentPen; L 23 48 42 67 $accentPen }
    'close' { L 24 24 72 72 $accentPen; L 72 24 24 72 $accentPen }
    'expand' { L 24 37 48 61 $accentPen; L 48 61 72 37 $accentPen }
    'collapse' { L 24 61 48 37 $accentPen; L 48 37 72 61 $accentPen }
  }
  $pen.Dispose(); $accentPen.Dispose(); $brush.Dispose(); $accentBrush.Dispose()
}

function Export-Icons {
  $names = @(
    'dashboard','live-map','device','history','settings','location','movement','parking',
    'speed','max-speed','stopped-duration','distance','last-update','coordinates',
    'online','lost-connection','offline-data','sync','pending-sync','retry','permission',
    'foreground-location','background-location','auto-start','battery-optimization',
    'notification','back','close','expand','collapse'
  )
  foreach ($name in $names) {
    $canvas = New-Bitmap 96 96 $transparent
    Draw-Glyph $name $canvas.Graphics
    Save-Bitmap $canvas (Join-Path $iconsDir "$name.png")
  }
}

function Draw-Illustration([string]$Name, [System.Drawing.Graphics]$Graphics) {
  $softBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#E8F0FD'))
  $mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#E2E8F0'))
  $bluePen = New-Pen $blue 6
  $mutedPen = New-Pen $muted 5
  $dangerPen = New-Pen $danger 6
  $Graphics.FillEllipse($softBrush, 76, 24, 168, 146)
  switch ($Name) {
    'offline' { $Graphics.DrawArc($bluePen,105,60,110,95,205,130); $Graphics.DrawArc($bluePen,128,85,64,55,205,130); $Graphics.FillEllipse($softBrush,153,128,14,14); $Graphics.DrawLine($dangerPen,104,45,218,160) }
    'no-devices' { $path=New-RoundedRect 112 44 96 126 22; $Graphics.FillPath($mutedBrush,$path); $Graphics.DrawPath($bluePen,$path); $path.Dispose(); $Graphics.DrawEllipse($bluePen,45,86,50,50); $Graphics.DrawLine($bluePen,95,111,112,111) }
    'no-history' { $Graphics.DrawEllipse($bluePen,96,43,128,128); $Graphics.DrawLine($bluePen,160,72,160,112); $Graphics.DrawLine($bluePen,160,112,190,128); $Graphics.DrawLine($mutedPen,45,70,92,70); $Graphics.DrawLine($mutedPen,45,96,82,96) }
    'map-empty' { $Graphics.DrawEllipse($bluePen,124,48,72,72); $Graphics.FillEllipse($softBrush,151,75,18,18); $Graphics.DrawLine($bluePen,160,120,160,164); $Graphics.DrawLine($mutedPen,55,142,112,104); $Graphics.DrawLine($mutedPen,112,104,137,124) }
    'sync-failed' { $Graphics.DrawArc($bluePen,94,46,130,120,210,220); $Graphics.DrawLine($bluePen,92,72,94,46); $Graphics.DrawLine($bluePen,94,46,121,47); $Graphics.DrawLine($dangerPen,142,83,184,125); $Graphics.DrawLine($dangerPen,184,83,142,125) }
    'permission-missing' { $path=New-Object System.Drawing.Drawing2D.GraphicsPath; $path.AddLines([System.Drawing.Point[]]@((New-Object System.Drawing.Point 160,35),(New-Object System.Drawing.Point 220,57),(New-Object System.Drawing.Point 210,128),(New-Object System.Drawing.Point 160,169),(New-Object System.Drawing.Point 110,128),(New-Object System.Drawing.Point 100,57))); $path.CloseFigure(); $Graphics.DrawPath($bluePen,$path); $path.Dispose(); $Graphics.DrawLine($dangerPen,138,82,182,126); $Graphics.DrawLine($dangerPen,182,82,138,126) }
  }
  $softBrush.Dispose(); $mutedBrush.Dispose(); $bluePen.Dispose(); $mutedPen.Dispose(); $dangerPen.Dispose()
}

function Export-Illustrations {
  foreach ($name in @('offline','no-devices','no-history','map-empty','sync-failed','permission-missing')) {
    $canvas = New-Bitmap 320 200 $transparent
    Draw-Illustration $name $canvas.Graphics
    Save-Bitmap $canvas (Join-Path $illustrationsDir "$name.png")
  }
}

Export-Branding
Export-NotificationForegroundIcon
Export-Icons
Export-Illustrations
Write-Output 'Track Device branding, icons, and illustrations generated.'
