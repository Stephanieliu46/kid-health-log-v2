$txtPath = 'C:\Users\steph\OneDrive\Documents\New Projects\KidHealthLog\Kid Health Log - UAT Test Cases - v2.1.txt'
$outPath = 'C:\Users\steph\OneDrive\Documents\New Projects\KidHealthLog\Kid Health Log - UAT Test Cases - v2.1.docx'
$utf8 = New-Object System.Text.UTF8Encoding $false
$lines = [System.IO.File]::ReadAllLines($txtPath, $utf8)

$docTitle = $lines[0].Trim()
$changelog = New-Object System.Collections.Generic.List[string]
$sections = New-Object System.Collections.Generic.List[object]
$currentSection = $null
$headers = @('ID', 'Module', 'Scenario', 'Steps', 'Expected Result', 'Status')

foreach ($line in $lines) {
  $trim = $line.Trim()
  if ($trim -eq '') { continue }
  if ($trim -match '^UAT 用户|^更新说明') { continue }

  if ($trim -match '\(Guest Flow|\(Episode CRUD|\(Log CRUD|\(Data Lifecycle|\(Pro Purchase') {
    if ($null -ne $currentSection) { [void]$sections.Add($currentSection) }
    $currentSection = [PSCustomObject]@{
      Title = $trim
      Rows  = New-Object System.Collections.Generic.List[object]
    }
    continue
  }

  if ($trim -match '^-\s+') {
    [void]$changelog.Add($trim)
    continue
  }

  if ($trim -match 'Steps\).*Status|Expected Result\).*Status') {
    $parts = ($trim -split '\s*\|\s*') | ForEach-Object { $_.Trim() }
    if ($parts.Count -ge 6) { $headers = $parts }
    continue
  }

  if ($trim -match '^UAT-\d{2}\s*\|') {
    if ($null -eq $currentSection) { continue }
    $parts = $trim -split '\s*\|\s*', 6
    if ($parts.Count -ge 6) {
      $steps = $parts[3].Trim() -replace '\.\s+(?=\d+\.)', ('.' + [Environment]::NewLine)
      $expected = $parts[4].Trim() -replace '\.\s+(?=\d+\.)', ('.' + [Environment]::NewLine)
      [void]$currentSection.Rows.Add(@(
        $parts[0].Trim(),
        $parts[1].Trim(),
        $parts[2].Trim(),
        $steps,
        $expected,
        $parts[5].Trim()
      ))
    }
  }
}
if ($null -ne $currentSection) { [void]$sections.Add($currentSection) }

$word = New-Object -ComObject Word.Application
$word.Visible = $false

try {
  if (Test-Path $outPath) { Remove-Item $outPath -Force }
  $doc = $word.Documents.Add()
  $doc.PageSetup.Orientation = 1
  $doc.PageSetup.LeftMargin = 36
  $doc.PageSetup.RightMargin = 36

  $title = $doc.Paragraphs.Add()
  $title.Range.Text = $docTitle
  $title.Range.Font.Bold = $true
  $title.Range.Font.Size = 16
  $title.Range.ParagraphFormat.Alignment = 1
  $null = $title.Range.InsertParagraphAfter()

  $chgTitle = $doc.Paragraphs.Add()
  $chgTitle.Range.Text = 'v2.1 Changelog'
  $chgTitle.Range.Font.Bold = $true
  $chgTitle.Range.Font.Size = 11
  foreach ($item in $changelog) {
    $p = $doc.Paragraphs.Add()
    $p.Range.Text = $item
    $p.Range.Font.Size = 10
    $p.Range.ParagraphFormat.LeftIndent = 18
  }
  $null = $doc.Paragraphs.Add()

  foreach ($section in $sections) {
    $sec = $doc.Paragraphs.Add()
    $sec.Range.Text = $section.Title
    $sec.Range.Font.Bold = $true
    $sec.Range.Font.Size = 12
    $sec.Range.ParagraphFormat.SpaceBefore = 10

    $rowCount = $section.Rows.Count + 1
    $anchor = $doc.Paragraphs.Add().Range
    $table = $doc.Tables.Add($anchor, $rowCount, 6)
    $table.Style = 'Table Grid'

    for ($c = 1; $c -le 6; $c++) {
      $cell = $table.Cell(1, $c)
      $cell.Range.Text = $headers[$c - 1]
      $cell.Range.Font.Bold = $true
      $cell.Range.Font.Size = 9
      $cell.Range.ParagraphFormat.Alignment = 1
      $cell.Shading.BackgroundPatternColor = 15921906
    }

    for ($r = 0; $r -lt $section.Rows.Count; $r++) {
      $row = $section.Rows[$r]
      for ($c = 0; $c -lt 6; $c++) {
        $cell = $table.Cell($r + 2, $c + 1)
        $cell.Range.Text = [string]$row[$c]
        $cell.Range.Font.Size = 9
        if ($c -eq 0 -or $c -eq 5) { $cell.Range.ParagraphFormat.Alignment = 1 }
      }
    }

    $widths = @(52, 72, 100, 135, 210, 60)
    for ($c = 1; $c -le 6; $c++) { $table.Columns.Item($c).Width = $widths[$c - 1] }
    $null = $doc.Paragraphs.Add()
  }

  $doc.SaveAs([ref]$outPath, [ref]16)
  $doc.Close()
  $totalCases = 0
  foreach ($s in $sections) { $totalCases += $s.Rows.Count }
  Write-Output "Created: $outPath"
  Write-Output "Sections: $($sections.Count); Cases: $totalCases"
}
finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
