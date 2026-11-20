# Stop any processes listening on ports 3000 and 5000
$ErrorActionPreference = 'SilentlyContinue'

$ports = @(3000, 5000)
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            if ($c.OwningProcess -gt 0) {
                try {
                    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                } catch {}
            }
        }
    }
}
exit 0
