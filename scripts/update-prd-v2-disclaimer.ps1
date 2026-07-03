$path = 'C:\Users\steph\OneDrive\Documents\New Projects\KidHealthLog\Kid Health Log - PRD v2.docx'
$word = New-Object -ComObject Word.Application
$word.Visible = $false

try {
  $doc = $word.Documents.Open($path)
  $range = $doc.Content
  $range.Collapse(0)

  $null = $range.InsertBreak(7)

  $sections = @(
    '',
    '2.7 Legal & Medical Disclaimer (v2.1 Addendum)',
    '',
    '[REQ-21] Initial Boot Disclaimer Gate',
    'On first app open (no kidhealth.disclaimer.v1 in localStorage), show a blocking Medical Disclaimer dialog while landing on Quick Log.',
    'Copy: title "Medical Disclaimer"; intro "By using this app, you agree to our Medical Disclaimer."; four English sections (Not Medical Advice / Consult a Professional / No Guarantee on Timers / Limitation of Liability).',
    'User must tap [I Understand / Agree] to dismiss; acceptance persists in localStorage and is not shown again.',
    'UAT: UAT-01 (initial flow + compliance acceptance).',
    '',
    '[REQ-22] NHS Safety Warning Liability Reinforcement',
    'Inside the Amber NHS Safety Warning dialog (Cancel + Proceed Anyway), embed the full four-part Medical Disclaimer below the interval warning.',
    'Above Proceed Anyway, show: "Proceeding implies you assume full responsibility for this dosage timing."',
    'UAT: UAT-11 (safety interval intercept).',
    '',
    '[REQ-23] Settings Disclaimer Entry',
    'At the bottom of Settings (below Version line), add permanent link [Medical Disclaimer & Privacy Policy].',
    'Opens a read-only dialog with full Medical Disclaimer + Privacy Policy (local-only storage). Close anytime; always available from Settings.',
    'UAT: UAT-24 (Settings disclaimer entry).',
    '',
    'Canonical Medical Disclaimer (English)',
    'Not Medical Advice: KidHealth Log is a personal tracking tool and does not provide professional medical advice, diagnosis, or treatment.',
    'Consult a Professional: Always seek the advice of your doctor, NHS 111, or other qualified healthcare providers with any questions you may have regarding a medical condition.',
    'No Guarantee on Timers: The medication safety timers and countdowns provided in this app are for informational reference only. While we strive for accuracy, software glitches or data delays may occur. Parents must independently verify medication dosages and timings as prescribed by healthcare professionals or product packaging.',
    'Limitation of Liability: By using this app, you agree that the developer shall not be held liable for any decisions made or actions taken in reliance upon the information provided by the application.'
  )

  foreach ($line in $sections) {
    $range = $doc.Content
    $range.Collapse(0)
    if ($line -eq '') {
      $null = $range.InsertParagraphAfter()
      continue
    }
    $range.Text = $line
    if ($line -match '^\[REQ-|^2\.7|^Canonical Medical') {
      $range.Font.Bold = $true
      $range.Font.Size = 12
    } else {
      $range.Font.Size = 10
    }
    $null = $range.InsertParagraphAfter()
  }

  $doc.Save()
  $doc.Close()
  Write-Output "Updated: $path"
} finally {
  $word.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
