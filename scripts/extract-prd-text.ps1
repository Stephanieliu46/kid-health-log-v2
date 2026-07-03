$path = 'C:\Users\steph\OneDrive\Documents\New Projects\KidHealthLog\Kid Health Log - PRD v2.docx'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open($path)
  $text = $doc.Content.Text
  $doc.Close()
  $len = [Math]::Min(12000, $text.Length)
  Write-Output $text.Substring(0, $len)
} finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
