# 한글 주석
param([int]$Times = 2)

$MaxSize = 10

function Get-Greeting {
    param([string]$Name = 'world')
    return "Hello $Name`n"
}

$message = Get-Greeting -Name "world"
Write-Output ($message * $Times) $MaxSize $true $null
