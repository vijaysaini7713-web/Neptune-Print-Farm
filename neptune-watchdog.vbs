' ====================================================================
'  NEPTUNE PRINT FARM - 24/7 STANDALONE WINDOWS BACKGROUND WATCHDOG
'  Runs 100% independently of Antigravity or any open console/terminal.
'  Auto-starts on Windows login and auto-recovers Node and Cloudflare.
' ====================================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

farmDir = "C:\Users\User\Neptune-Print-Farm"
nodeExe = "C:\nvm4w\nodejs\node.exe"
serverJs = farmDir & "\server\index.js"
cfExe = farmDir & "\tools\cloudflared.exe"
logFile = farmDir & "\watchdog.log"

WshShell.CurrentDirectory = farmDir

If Not fso.FileExists(nodeExe) Then
    nodeExe = "node.exe"
End If

Sub LogMsg(msg)
    On Error Resume Next
    Set ts = fso.OpenTextFile(logFile, 8, True)
    ts.WriteLine Now & " - " & msg
    ts.Close
    On Error GoTo 0
End Sub

Function IsNodeRunning()
    IsNodeRunning = False
    On Error Resume Next
    Set wmi = GetObject("winmgmts:\\.\root\cimv2")
    Set procs = wmi.ExecQuery("Select ProcessId, CommandLine from Win32_Process Where Name = 'node.exe'")
    If Err.Number = 0 Then
        For Each p In procs
            cmd = LCase(p.CommandLine & "")
            If InStr(cmd, "server\index.js") > 0 Or InStr(cmd, "server/index.js") > 0 Then
                IsNodeRunning = True
                Exit For
            End If
        Next
    End If
    On Error GoTo 0
End Function

Function IsCloudflaredRunning()
    IsCloudflaredRunning = False
    On Error Resume Next
    Set wmi = GetObject("winmgmts:\\.\root\cimv2")
    Set procs = wmi.ExecQuery("Select ProcessId from Win32_Process Where Name = 'cloudflared.exe'")
    If Err.Number = 0 And procs.Count > 0 Then
        IsCloudflaredRunning = True
    End If
    On Error GoTo 0
End Function

' Prevent duplicate watchdog instances
On Error Resume Next
Set wmiCheck = GetObject("winmgmts:\\.\root\cimv2")
Set runningWatchdogs = wmiCheck.ExecQuery("Select ProcessId, CommandLine from Win32_Process Where (Name = 'wscript.exe' Or Name = 'cscript.exe')")
count = 0
If Err.Number = 0 Then
    For Each w In runningWatchdogs
        cmd = LCase(w.CommandLine & "")
        If InStr(cmd, "neptune-watchdog.vbs") > 0 Then
            count = count + 1
        End If
    Next
    If count > 1 Then
        ' Another instance is already running
        WScript.Quit 0
    End If
End If
On Error GoTo 0

LogMsg "Neptune Watchdog Service Started (Standalone Mode)"

' Main Watchdog Loop - Runs 24/7 in background
Do
    ' 1. Check Node.js server
    If Not IsNodeRunning() Then
        LogMsg "Node.js server not running. Launching Node.js..."
        WshShell.Run """" & nodeExe & """ """ & serverJs & """", 0, False
        WScript.Sleep 3000
    End If

    ' 2. Check Cloudflare Tunnel
    If Not IsCloudflaredRunning() Then
        LogMsg "cloudflared.exe not running. Launching Cloudflare Tunnel..."
        WshShell.Run """" & cfExe & """ tunnel run neptune-farm", 0, False
        WScript.Sleep 3000
    End If

    ' Sleep 10 seconds before next health check
    WScript.Sleep 10000
Loop
