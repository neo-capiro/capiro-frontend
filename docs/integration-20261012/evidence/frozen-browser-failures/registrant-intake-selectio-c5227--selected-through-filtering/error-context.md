# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: registrant-intake.spec.ts >> selection stops at100 and remains selected through filtering
- Location: tests/browser/registrant-intake.spec.ts:659:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.check: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('checkbox', { name: 'Select Synthetic Client 45', exact: true })
    - locator resolved to <input type="checkbox" aria-label="Select Synthetic Client 45"/>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed

```

# Page snapshot

```yaml
- generic:
  - generic:
    - main:
      - heading [level=1]: Portfolio
      - paragraph: Synthetic retained LDA intake acceptance.
      - button: Import with LDA
      - text: "0"
  - dialog "Import with LDA" [ref=e2]:
    - banner [ref=e3]:
      - heading "Import with LDA" [level=2] [ref=e4]
      - button "Close" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
    - paragraph [ref=e9]: Import with LDA
    - button "← Back" [ref=e10] [cursor=pointer]
    - generic [ref=e11]: "Firm-wide setup · Linked firm: Maven Advocacy"
    - region "Review LDA clients" [ref=e12]:
      - paragraph [ref=e13]: 101 matched clients from Maven Advocacy. Select which to add. No client profiles are created until you confirm.
      - generic [ref=e14]:
        - textbox "Filter clients" [ref=e15]
        - button "Change firm" [ref=e16] [cursor=pointer]
      - list [ref=e17]:
        - listitem [ref=e18]:
          - generic [ref=e19]:
            - checkbox "Select Synthetic Client 1" [checked] [ref=e20]
            - generic [ref=e22]:
              - strong [ref=e23]: Synthetic Client 1
              - 'generic "Disclosed total: $2,400,000" [ref=e24]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e25]:
          - generic [ref=e26]:
            - checkbox "Select Synthetic Client 2" [checked] [ref=e27]
            - generic [ref=e29]:
              - strong [ref=e30]: Synthetic Client 2
              - 'generic "Disclosed total: $2,400,000" [ref=e31]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e32]:
          - generic [ref=e33]:
            - checkbox "Select Synthetic Client 3" [checked] [ref=e34]
            - generic [ref=e36]:
              - strong [ref=e37]: Synthetic Client 3
              - 'generic "Disclosed total: $2,400,000" [ref=e38]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e39]:
          - generic [ref=e40]:
            - checkbox "Select Synthetic Client 4" [checked] [ref=e41]
            - generic [ref=e43]:
              - strong [ref=e44]: Synthetic Client 4
              - 'generic "Disclosed total: $2,400,000" [ref=e45]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e46]:
          - generic [ref=e47]:
            - checkbox "Select Synthetic Client 5" [checked] [ref=e48]
            - generic [ref=e50]:
              - strong [ref=e51]: Synthetic Client 5
              - 'generic "Disclosed total: $2,400,000" [ref=e52]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e53]:
          - generic [ref=e54]:
            - checkbox "Select Synthetic Client 6" [checked] [ref=e55]
            - generic [ref=e57]:
              - strong [ref=e58]: Synthetic Client 6
              - 'generic "Disclosed total: $2,400,000" [ref=e59]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e60]:
          - generic [ref=e61]:
            - checkbox "Select Synthetic Client 7" [checked] [ref=e62]
            - generic [ref=e64]:
              - strong [ref=e65]: Synthetic Client 7
              - 'generic "Disclosed total: $2,400,000" [ref=e66]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e67]:
          - generic [ref=e68]:
            - checkbox "Select Synthetic Client 8" [checked] [ref=e69]
            - generic [ref=e71]:
              - strong [ref=e72]: Synthetic Client 8
              - 'generic "Disclosed total: $2,400,000" [ref=e73]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e74]:
          - generic [ref=e75]:
            - checkbox "Select Synthetic Client 9" [checked] [ref=e76]
            - generic [ref=e78]:
              - strong [ref=e79]: Synthetic Client 9
              - 'generic "Disclosed total: $2,400,000" [ref=e80]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e81]:
          - generic [ref=e82]:
            - checkbox "Select Synthetic Client 10" [checked] [ref=e83]
            - generic [ref=e85]:
              - strong [ref=e86]: Synthetic Client 10
              - 'generic "Disclosed total: $2,400,000" [ref=e87]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e88]:
          - generic [ref=e89]:
            - checkbox "Select Synthetic Client 11" [checked] [ref=e90]
            - generic [ref=e92]:
              - strong [ref=e93]: Synthetic Client 11
              - 'generic "Disclosed total: $2,400,000" [ref=e94]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e95]:
          - generic [ref=e96]:
            - checkbox "Select Synthetic Client 12" [checked] [ref=e97]
            - generic [ref=e99]:
              - strong [ref=e100]: Synthetic Client 12
              - 'generic "Disclosed total: $2,400,000" [ref=e101]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e102]:
          - generic [ref=e103]:
            - checkbox "Select Synthetic Client 13" [checked] [ref=e104]
            - generic [ref=e106]:
              - strong [ref=e107]: Synthetic Client 13
              - 'generic "Disclosed total: $2,400,000" [ref=e108]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e109]:
          - generic [ref=e110]:
            - checkbox "Select Synthetic Client 14" [checked] [ref=e111]
            - generic [ref=e113]:
              - strong [ref=e114]: Synthetic Client 14
              - 'generic "Disclosed total: $2,400,000" [ref=e115]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e116]:
          - generic [ref=e117]:
            - checkbox "Select Synthetic Client 15" [checked] [ref=e118]
            - generic [ref=e120]:
              - strong [ref=e121]: Synthetic Client 15
              - 'generic "Disclosed total: $2,400,000" [ref=e122]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e123]:
          - generic [ref=e124]:
            - checkbox "Select Synthetic Client 16" [checked] [ref=e125]
            - generic [ref=e127]:
              - strong [ref=e128]: Synthetic Client 16
              - 'generic "Disclosed total: $2,400,000" [ref=e129]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e130]:
          - generic [ref=e131]:
            - checkbox "Select Synthetic Client 17" [checked] [ref=e132]
            - generic [ref=e134]:
              - strong [ref=e135]: Synthetic Client 17
              - 'generic "Disclosed total: $2,400,000" [ref=e136]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e137]:
          - generic [ref=e138]:
            - checkbox "Select Synthetic Client 18" [checked] [ref=e139]
            - generic [ref=e141]:
              - strong [ref=e142]: Synthetic Client 18
              - 'generic "Disclosed total: $2,400,000" [ref=e143]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e144]:
          - generic [ref=e145]:
            - checkbox "Select Synthetic Client 19" [checked] [ref=e146]
            - generic [ref=e148]:
              - strong [ref=e149]: Synthetic Client 19
              - 'generic "Disclosed total: $2,400,000" [ref=e150]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e151]:
          - generic [ref=e152]:
            - checkbox "Select Synthetic Client 20" [checked] [ref=e153]
            - generic [ref=e155]:
              - strong [ref=e156]: Synthetic Client 20
              - 'generic "Disclosed total: $2,400,000" [ref=e157]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e158]:
          - generic [ref=e159]:
            - checkbox "Select Synthetic Client 21" [checked] [ref=e160]
            - generic [ref=e162]:
              - strong [ref=e163]: Synthetic Client 21
              - 'generic "Disclosed total: $2,400,000" [ref=e164]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e165]:
          - generic [ref=e166]:
            - checkbox "Select Synthetic Client 22" [checked] [ref=e167]
            - generic [ref=e169]:
              - strong [ref=e170]: Synthetic Client 22
              - 'generic "Disclosed total: $2,400,000" [ref=e171]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e172]:
          - generic [ref=e173]:
            - checkbox "Select Synthetic Client 23" [checked] [ref=e174]
            - generic [ref=e176]:
              - strong [ref=e177]: Synthetic Client 23
              - 'generic "Disclosed total: $2,400,000" [ref=e178]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e179]:
          - generic [ref=e180]:
            - checkbox "Select Synthetic Client 24" [checked] [ref=e181]
            - generic [ref=e183]:
              - strong [ref=e184]: Synthetic Client 24
              - 'generic "Disclosed total: $2,400,000" [ref=e185]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e186]:
          - generic [ref=e187]:
            - checkbox "Select Synthetic Client 25" [checked] [ref=e188]
            - generic [ref=e190]:
              - strong [ref=e191]: Synthetic Client 25
              - 'generic "Disclosed total: $2,400,000" [ref=e192]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e193]:
          - generic [ref=e194]:
            - checkbox "Select Synthetic Client 26" [checked] [ref=e195]
            - generic [ref=e197]:
              - strong [ref=e198]: Synthetic Client 26
              - 'generic "Disclosed total: $2,400,000" [ref=e199]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e200]:
          - generic [ref=e201]:
            - checkbox "Select Synthetic Client 27" [checked] [ref=e202]
            - generic [ref=e204]:
              - strong [ref=e205]: Synthetic Client 27
              - 'generic "Disclosed total: $2,400,000" [ref=e206]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e207]:
          - generic [ref=e208]:
            - checkbox "Select Synthetic Client 28" [checked] [ref=e209]
            - generic [ref=e211]:
              - strong [ref=e212]: Synthetic Client 28
              - 'generic "Disclosed total: $2,400,000" [ref=e213]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e214]:
          - generic [ref=e215]:
            - checkbox "Select Synthetic Client 29" [checked] [ref=e216]
            - generic [ref=e218]:
              - strong [ref=e219]: Synthetic Client 29
              - 'generic "Disclosed total: $2,400,000" [ref=e220]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e221]:
          - generic [ref=e222]:
            - checkbox "Select Synthetic Client 30" [checked] [ref=e223]
            - generic [ref=e225]:
              - strong [ref=e226]: Synthetic Client 30
              - 'generic "Disclosed total: $2,400,000" [ref=e227]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e228]:
          - generic [ref=e229]:
            - checkbox "Select Synthetic Client 31" [checked] [ref=e230]
            - generic [ref=e232]:
              - strong [ref=e233]: Synthetic Client 31
              - 'generic "Disclosed total: $2,400,000" [ref=e234]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e235]:
          - generic [ref=e236]:
            - checkbox "Select Synthetic Client 32" [checked] [ref=e237]
            - generic [ref=e239]:
              - strong [ref=e240]: Synthetic Client 32
              - 'generic "Disclosed total: $2,400,000" [ref=e241]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e242]:
          - generic [ref=e243]:
            - checkbox "Select Synthetic Client 33" [checked] [ref=e244]
            - generic [ref=e246]:
              - strong [ref=e247]: Synthetic Client 33
              - 'generic "Disclosed total: $2,400,000" [ref=e248]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e249]:
          - generic [ref=e250]:
            - checkbox "Select Synthetic Client 34" [checked] [ref=e251]
            - generic [ref=e253]:
              - strong [ref=e254]: Synthetic Client 34
              - 'generic "Disclosed total: $2,400,000" [ref=e255]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e256]:
          - generic [ref=e257]:
            - checkbox "Select Synthetic Client 35" [checked] [ref=e258]
            - generic [ref=e260]:
              - strong [ref=e261]: Synthetic Client 35
              - 'generic "Disclosed total: $2,400,000" [ref=e262]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e263]:
          - generic [ref=e264]:
            - checkbox "Select Synthetic Client 36" [checked] [ref=e265]
            - generic [ref=e267]:
              - strong [ref=e268]: Synthetic Client 36
              - 'generic "Disclosed total: $2,400,000" [ref=e269]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e270]:
          - generic [ref=e271]:
            - checkbox "Select Synthetic Client 37" [checked] [ref=e272]
            - generic [ref=e274]:
              - strong [ref=e275]: Synthetic Client 37
              - 'generic "Disclosed total: $2,400,000" [ref=e276]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e277]:
          - generic [ref=e278]:
            - checkbox "Select Synthetic Client 38" [checked] [ref=e279]
            - generic [ref=e281]:
              - strong [ref=e282]: Synthetic Client 38
              - 'generic "Disclosed total: $2,400,000" [ref=e283]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e284]:
          - generic [ref=e285]:
            - checkbox "Select Synthetic Client 39" [checked] [ref=e286]
            - generic [ref=e288]:
              - strong [ref=e289]: Synthetic Client 39
              - 'generic "Disclosed total: $2,400,000" [ref=e290]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e291]:
          - generic [ref=e292]:
            - checkbox "Select Synthetic Client 40" [checked] [ref=e293]
            - generic [ref=e295]:
              - strong [ref=e296]: Synthetic Client 40
              - 'generic "Disclosed total: $2,400,000" [ref=e297]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e298]:
          - generic [ref=e299]:
            - checkbox "Select Synthetic Client 41" [checked] [ref=e300]
            - generic [ref=e302]:
              - strong [ref=e303]: Synthetic Client 41
              - 'generic "Disclosed total: $2,400,000" [ref=e304]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e305]:
          - generic [ref=e306]:
            - checkbox "Select Synthetic Client 42" [checked] [ref=e307]
            - generic [ref=e309]:
              - strong [ref=e310]: Synthetic Client 42
              - 'generic "Disclosed total: $2,400,000" [ref=e311]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e312]:
          - generic [ref=e313]:
            - checkbox "Select Synthetic Client 43" [checked] [ref=e314]
            - generic [ref=e316]:
              - strong [ref=e317]: Synthetic Client 43
              - 'generic "Disclosed total: $2,400,000" [ref=e318]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e319]:
          - generic [ref=e320]:
            - checkbox "Select Synthetic Client 44" [checked] [active] [ref=e321]
            - generic [ref=e323]:
              - strong [ref=e324]: Synthetic Client 44
              - 'generic "Disclosed total: $2,400,000" [ref=e325]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e326]:
          - generic [ref=e327]:
            - checkbox "Select Synthetic Client 45" [ref=e328]
            - generic [ref=e330]:
              - strong [ref=e331]: Synthetic Client 45
              - 'generic "Disclosed total: $2,400,000" [ref=e332]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e333]:
          - generic [ref=e334]:
            - checkbox "Select Synthetic Client 46" [ref=e335]
            - generic [ref=e337]:
              - strong [ref=e338]: Synthetic Client 46
              - 'generic "Disclosed total: $2,400,000" [ref=e339]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e340]:
          - generic [ref=e341]:
            - checkbox "Select Synthetic Client 47" [ref=e342]
            - generic [ref=e344]:
              - strong [ref=e345]: Synthetic Client 47
              - 'generic "Disclosed total: $2,400,000" [ref=e346]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e347]:
          - generic [ref=e348]:
            - checkbox "Select Synthetic Client 48" [ref=e349]
            - generic [ref=e351]:
              - strong [ref=e352]: Synthetic Client 48
              - 'generic "Disclosed total: $2,400,000" [ref=e353]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e354]:
          - generic [ref=e355]:
            - checkbox "Select Synthetic Client 49" [ref=e356]
            - generic [ref=e358]:
              - strong [ref=e359]: Synthetic Client 49
              - 'generic "Disclosed total: $2,400,000" [ref=e360]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e361]:
          - generic [ref=e362]:
            - checkbox "Select Synthetic Client 50" [ref=e363]
            - generic [ref=e365]:
              - strong [ref=e366]: Synthetic Client 50
              - 'generic "Disclosed total: $2,400,000" [ref=e367]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e368]:
          - generic [ref=e369]:
            - checkbox "Select Synthetic Client 51" [ref=e370]
            - generic [ref=e372]:
              - strong [ref=e373]: Synthetic Client 51
              - 'generic "Disclosed total: $2,400,000" [ref=e374]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e375]:
          - generic [ref=e376]:
            - checkbox "Select Synthetic Client 52" [ref=e377]
            - generic [ref=e379]:
              - strong [ref=e380]: Synthetic Client 52
              - 'generic "Disclosed total: $2,400,000" [ref=e381]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e382]:
          - generic [ref=e383]:
            - checkbox "Select Synthetic Client 53" [ref=e384]
            - generic [ref=e386]:
              - strong [ref=e387]: Synthetic Client 53
              - 'generic "Disclosed total: $2,400,000" [ref=e388]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e389]:
          - generic [ref=e390]:
            - checkbox "Select Synthetic Client 54" [ref=e391]
            - generic [ref=e393]:
              - strong [ref=e394]: Synthetic Client 54
              - 'generic "Disclosed total: $2,400,000" [ref=e395]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e396]:
          - generic [ref=e397]:
            - checkbox "Select Synthetic Client 55" [ref=e398]
            - generic [ref=e400]:
              - strong [ref=e401]: Synthetic Client 55
              - 'generic "Disclosed total: $2,400,000" [ref=e402]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e403]:
          - generic [ref=e404]:
            - checkbox "Select Synthetic Client 56" [ref=e405]
            - generic [ref=e407]:
              - strong [ref=e408]: Synthetic Client 56
              - 'generic "Disclosed total: $2,400,000" [ref=e409]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e410]:
          - generic [ref=e411]:
            - checkbox "Select Synthetic Client 57" [ref=e412]
            - generic [ref=e414]:
              - strong [ref=e415]: Synthetic Client 57
              - 'generic "Disclosed total: $2,400,000" [ref=e416]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e417]:
          - generic [ref=e418]:
            - checkbox "Select Synthetic Client 58" [ref=e419]
            - generic [ref=e421]:
              - strong [ref=e422]: Synthetic Client 58
              - 'generic "Disclosed total: $2,400,000" [ref=e423]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e424]:
          - generic [ref=e425]:
            - checkbox "Select Synthetic Client 59" [ref=e426]
            - generic [ref=e428]:
              - strong [ref=e429]: Synthetic Client 59
              - 'generic "Disclosed total: $2,400,000" [ref=e430]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e431]:
          - generic [ref=e432]:
            - checkbox "Select Synthetic Client 60" [ref=e433]
            - generic [ref=e435]:
              - strong [ref=e436]: Synthetic Client 60
              - 'generic "Disclosed total: $2,400,000" [ref=e437]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e438]:
          - generic [ref=e439]:
            - checkbox "Select Synthetic Client 61" [ref=e440]
            - generic [ref=e442]:
              - strong [ref=e443]: Synthetic Client 61
              - 'generic "Disclosed total: $2,400,000" [ref=e444]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e445]:
          - generic [ref=e446]:
            - checkbox "Select Synthetic Client 62" [ref=e447]
            - generic [ref=e449]:
              - strong [ref=e450]: Synthetic Client 62
              - 'generic "Disclosed total: $2,400,000" [ref=e451]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e452]:
          - generic [ref=e453]:
            - checkbox "Select Synthetic Client 63" [ref=e454]
            - generic [ref=e456]:
              - strong [ref=e457]: Synthetic Client 63
              - 'generic "Disclosed total: $2,400,000" [ref=e458]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e459]:
          - generic [ref=e460]:
            - checkbox "Select Synthetic Client 64" [ref=e461]
            - generic [ref=e463]:
              - strong [ref=e464]: Synthetic Client 64
              - 'generic "Disclosed total: $2,400,000" [ref=e465]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e466]:
          - generic [ref=e467]:
            - checkbox "Select Synthetic Client 65" [ref=e468]
            - generic [ref=e470]:
              - strong [ref=e471]: Synthetic Client 65
              - 'generic "Disclosed total: $2,400,000" [ref=e472]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e473]:
          - generic [ref=e474]:
            - checkbox "Select Synthetic Client 66" [ref=e475]
            - generic [ref=e477]:
              - strong [ref=e478]: Synthetic Client 66
              - 'generic "Disclosed total: $2,400,000" [ref=e479]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e480]:
          - generic [ref=e481]:
            - checkbox "Select Synthetic Client 67" [ref=e482]
            - generic [ref=e484]:
              - strong [ref=e485]: Synthetic Client 67
              - 'generic "Disclosed total: $2,400,000" [ref=e486]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e487]:
          - generic [ref=e488]:
            - checkbox "Select Synthetic Client 68" [ref=e489]
            - generic [ref=e491]:
              - strong [ref=e492]: Synthetic Client 68
              - 'generic "Disclosed total: $2,400,000" [ref=e493]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e494]:
          - generic [ref=e495]:
            - checkbox "Select Synthetic Client 69" [ref=e496]
            - generic [ref=e498]:
              - strong [ref=e499]: Synthetic Client 69
              - 'generic "Disclosed total: $2,400,000" [ref=e500]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e501]:
          - generic [ref=e502]:
            - checkbox "Select Synthetic Client 70" [ref=e503]
            - generic [ref=e505]:
              - strong [ref=e506]: Synthetic Client 70
              - 'generic "Disclosed total: $2,400,000" [ref=e507]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e508]:
          - generic [ref=e509]:
            - checkbox "Select Synthetic Client 71" [ref=e510]
            - generic [ref=e512]:
              - strong [ref=e513]: Synthetic Client 71
              - 'generic "Disclosed total: $2,400,000" [ref=e514]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e515]:
          - generic [ref=e516]:
            - checkbox "Select Synthetic Client 72" [ref=e517]
            - generic [ref=e519]:
              - strong [ref=e520]: Synthetic Client 72
              - 'generic "Disclosed total: $2,400,000" [ref=e521]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e522]:
          - generic [ref=e523]:
            - checkbox "Select Synthetic Client 73" [ref=e524]
            - generic [ref=e526]:
              - strong [ref=e527]: Synthetic Client 73
              - 'generic "Disclosed total: $2,400,000" [ref=e528]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e529]:
          - generic [ref=e530]:
            - checkbox "Select Synthetic Client 74" [ref=e531]
            - generic [ref=e533]:
              - strong [ref=e534]: Synthetic Client 74
              - 'generic "Disclosed total: $2,400,000" [ref=e535]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e536]:
          - generic [ref=e537]:
            - checkbox "Select Synthetic Client 75" [ref=e538]
            - generic [ref=e540]:
              - strong [ref=e541]: Synthetic Client 75
              - 'generic "Disclosed total: $2,400,000" [ref=e542]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e543]:
          - generic [ref=e544]:
            - checkbox "Select Synthetic Client 76" [ref=e545]
            - generic [ref=e547]:
              - strong [ref=e548]: Synthetic Client 76
              - 'generic "Disclosed total: $2,400,000" [ref=e549]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e550]:
          - generic [ref=e551]:
            - checkbox "Select Synthetic Client 77" [ref=e552]
            - generic [ref=e554]:
              - strong [ref=e555]: Synthetic Client 77
              - 'generic "Disclosed total: $2,400,000" [ref=e556]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e557]:
          - generic [ref=e558]:
            - checkbox "Select Synthetic Client 78" [ref=e559]
            - generic [ref=e561]:
              - strong [ref=e562]: Synthetic Client 78
              - 'generic "Disclosed total: $2,400,000" [ref=e563]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e564]:
          - generic [ref=e565]:
            - checkbox "Select Synthetic Client 79" [ref=e566]
            - generic [ref=e568]:
              - strong [ref=e569]: Synthetic Client 79
              - 'generic "Disclosed total: $2,400,000" [ref=e570]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e571]:
          - generic [ref=e572]:
            - checkbox "Select Synthetic Client 80" [ref=e573]
            - generic [ref=e575]:
              - strong [ref=e576]: Synthetic Client 80
              - 'generic "Disclosed total: $2,400,000" [ref=e577]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e578]:
          - generic [ref=e579]:
            - checkbox "Select Synthetic Client 81" [ref=e580]
            - generic [ref=e582]:
              - strong [ref=e583]: Synthetic Client 81
              - 'generic "Disclosed total: $2,400,000" [ref=e584]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e585]:
          - generic [ref=e586]:
            - checkbox "Select Synthetic Client 82" [ref=e587]
            - generic [ref=e589]:
              - strong [ref=e590]: Synthetic Client 82
              - 'generic "Disclosed total: $2,400,000" [ref=e591]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e592]:
          - generic [ref=e593]:
            - checkbox "Select Synthetic Client 83" [ref=e594]
            - generic [ref=e596]:
              - strong [ref=e597]: Synthetic Client 83
              - 'generic "Disclosed total: $2,400,000" [ref=e598]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e599]:
          - generic [ref=e600]:
            - checkbox "Select Synthetic Client 84" [ref=e601]
            - generic [ref=e603]:
              - strong [ref=e604]: Synthetic Client 84
              - 'generic "Disclosed total: $2,400,000" [ref=e605]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e606]:
          - generic [ref=e607]:
            - checkbox "Select Synthetic Client 85" [ref=e608]
            - generic [ref=e610]:
              - strong [ref=e611]: Synthetic Client 85
              - 'generic "Disclosed total: $2,400,000" [ref=e612]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e613]:
          - generic [ref=e614]:
            - checkbox "Select Synthetic Client 86" [ref=e615]
            - generic [ref=e617]:
              - strong [ref=e618]: Synthetic Client 86
              - 'generic "Disclosed total: $2,400,000" [ref=e619]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e620]:
          - generic [ref=e621]:
            - checkbox "Select Synthetic Client 87" [ref=e622]
            - generic [ref=e624]:
              - strong [ref=e625]: Synthetic Client 87
              - 'generic "Disclosed total: $2,400,000" [ref=e626]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e627]:
          - generic [ref=e628]:
            - checkbox "Select Synthetic Client 88" [ref=e629]
            - generic [ref=e631]:
              - strong [ref=e632]: Synthetic Client 88
              - 'generic "Disclosed total: $2,400,000" [ref=e633]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e634]:
          - generic [ref=e635]:
            - checkbox "Select Synthetic Client 89" [ref=e636]
            - generic [ref=e638]:
              - strong [ref=e639]: Synthetic Client 89
              - 'generic "Disclosed total: $2,400,000" [ref=e640]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e641]:
          - generic [ref=e642]:
            - checkbox "Select Synthetic Client 90" [ref=e643]
            - generic [ref=e645]:
              - strong [ref=e646]: Synthetic Client 90
              - 'generic "Disclosed total: $2,400,000" [ref=e647]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e648]:
          - generic [ref=e649]:
            - checkbox "Select Synthetic Client 91" [ref=e650]
            - generic [ref=e652]:
              - strong [ref=e653]: Synthetic Client 91
              - 'generic "Disclosed total: $2,400,000" [ref=e654]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e655]:
          - generic [ref=e656]:
            - checkbox "Select Synthetic Client 92" [ref=e657]
            - generic [ref=e659]:
              - strong [ref=e660]: Synthetic Client 92
              - 'generic "Disclosed total: $2,400,000" [ref=e661]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e662]:
          - generic [ref=e663]:
            - checkbox "Select Synthetic Client 93" [ref=e664]
            - generic [ref=e666]:
              - strong [ref=e667]: Synthetic Client 93
              - 'generic "Disclosed total: $2,400,000" [ref=e668]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e669]:
          - generic [ref=e670]:
            - checkbox "Select Synthetic Client 94" [ref=e671]
            - generic [ref=e673]:
              - strong [ref=e674]: Synthetic Client 94
              - 'generic "Disclosed total: $2,400,000" [ref=e675]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e676]:
          - generic [ref=e677]:
            - checkbox "Select Synthetic Client 95" [ref=e678]
            - generic [ref=e680]:
              - strong [ref=e681]: Synthetic Client 95
              - 'generic "Disclosed total: $2,400,000" [ref=e682]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e683]:
          - generic [ref=e684]:
            - checkbox "Select Synthetic Client 96" [ref=e685]
            - generic [ref=e687]:
              - strong [ref=e688]: Synthetic Client 96
              - 'generic "Disclosed total: $2,400,000" [ref=e689]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e690]:
          - generic [ref=e691]:
            - checkbox "Select Synthetic Client 97" [ref=e692]
            - generic [ref=e694]:
              - strong [ref=e695]: Synthetic Client 97
              - 'generic "Disclosed total: $2,400,000" [ref=e696]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e697]:
          - generic [ref=e698]:
            - checkbox "Select Synthetic Client 98" [ref=e699]
            - generic [ref=e701]:
              - strong [ref=e702]: Synthetic Client 98
              - 'generic "Disclosed total: $2,400,000" [ref=e703]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e704]:
          - generic [ref=e705]:
            - checkbox "Select Synthetic Client 99" [ref=e706]
            - generic [ref=e708]:
              - strong [ref=e709]: Synthetic Client 99
              - 'generic "Disclosed total: $2,400,000" [ref=e710]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e711]:
          - generic [ref=e712]:
            - checkbox "Select Synthetic Client 100" [ref=e713]
            - generic [ref=e715]:
              - strong [ref=e716]: Synthetic Client 100
              - 'generic "Disclosed total: $2,400,000" [ref=e717]': 14 filings · latest 2026 · $2.4M disclosed total
        - listitem [ref=e718]:
          - generic [ref=e719]:
            - checkbox "Select Synthetic Client 101" [ref=e720]
            - generic [ref=e722]:
              - strong [ref=e723]: Synthetic Client 101
              - 'generic "Disclosed total: $2,400,000" [ref=e724]': 14 filings · latest 2026 · $2.4M disclosed total
    - contentinfo [ref=e725]:
      - generic [ref=e726]: Each imported client is linked to its federal LDA data.
      - button "Cancel" [ref=e727] [cursor=pointer]
      - button "Import 44 clients" [ref=e728] [cursor=pointer]
```

# Test source

```ts
  573 |   ).toBeChecked();
  574 |   await expect(page.getByTestId("receipts")).toHaveText("0");
  575 | });
  576 | 
  577 | test("empty candidate feed remains an explicit empty state", async ({
  578 |   page,
  579 | }) => {
  580 |   await setup(page, { candidates: [] });
  581 |   await expect(
  582 |     page.getByText("No LDA client filings were found for this firm."),
  583 |   ).toBeVisible();
  584 |   await expect(
  585 |     page.getByRole("button", { name: "Import 0 clients" }),
  586 |   ).toBeDisabled();
  587 | });
  588 | 
  589 | test("lost firm-link receipt requires readback and never imports implicitly", async ({
  590 |   page,
  591 | }) => {
  592 |   const state = await setup(page, { linked: false });
  593 |   let linked = false;
  594 |   let writes = 0;
  595 |   await page.route("**/firm/registrant", (route) => {
  596 |     if (route.request().method() === "PUT") {
  597 |       linked = true;
  598 |       writes++;
  599 |       return route.fulfill({
  600 |         status: 503,
  601 |         json: { message: "Link receipt unavailable" },
  602 |       });
  603 |     }
  604 |     return route.fulfill({
  605 |       json: linked
  606 |         ? anchor
  607 |         : { ldaRegistrantId: null, ldaRegistrantName: null },
  608 |     });
  609 |   });
  610 |   await page.getByRole("textbox", { name: "Firm name" }).fill("Maven");
  611 |   await page.getByRole("button", { name: "Search", exact: true }).click();
  612 |   await page.getByRole("button", { name: "Link Maven Advocacy" }).click();
  613 |   await page.getByRole("button", { name: "Confirm firm link" }).click();
  614 |   await expect(
  615 |     page.getByText(
  616 |       "The firm link is not confirmed. Read back the current link before choosing again.",
  617 |     ),
  618 |   ).toBeVisible();
  619 |   await expect(
  620 |     page.getByRole("button", { name: "Confirm firm link" }),
  621 |   ).toBeDisabled();
  622 |   await page.getByRole("button", { name: "Refresh linked firm" }).click();
  623 |   await expect(
  624 |     page.getByText("Firm-wide setup · Linked firm: Maven Advocacy"),
  625 |   ).toBeVisible();
  626 |   expect(writes).toBe(1);
  627 |   expect(state.posts).toBe(0);
  628 | });
  629 | 
  630 | test("foreign successful-looking receipt is refused and stays unconfirmed", async ({
  631 |   page,
  632 | }) => {
  633 |   await setup(page);
  634 |   await page.route("**/firm/import", (route) =>
  635 |     route.fulfill({
  636 |       json: {
  637 |         created: 1,
  638 |         items: [{ id: "foreign", name: "Foreign", ldaClientId: 99 }],
  639 |         skipped: [],
  640 |       },
  641 |     }),
  642 |   );
  643 |   await page
  644 |     .getByRole("checkbox", { name: "Select Saronic Technologies" })
  645 |     .check();
  646 |   await page
  647 |     .getByRole("button", { name: "Import 1 client", exact: true })
  648 |     .click();
  649 |   await expect(
  650 |     page.getByRole("heading", { name: "Import completion is unconfirmed" }),
  651 |   ).toBeVisible();
  652 |   await expect(page.getByText("Original LDA client IDs: 8")).toBeVisible();
  653 |   await expect(page.getByTestId("receipts")).toHaveText("0");
  654 |   await expect(
  655 |     page.getByText("1 client profiles created. 0 skipped."),
  656 |   ).toHaveCount(0);
  657 | });
  658 | 
  659 | test("selection stops at100 and remains selected through filtering", async ({
  660 |   page,
  661 | }) => {
  662 |   const state = await setup(page, {
  663 |     candidates: Array.from({ length: 101 }, (_, index) =>
  664 |       candidate(index + 1, `Synthetic Client ${index + 1}`),
  665 |     ),
  666 |   });
  667 |   for (let id = 1; id <= 100; id++)
  668 |     await page
  669 |       .getByRole("checkbox", {
  670 |         name: `Select Synthetic Client ${id}`,
  671 |         exact: true,
  672 |       })
> 673 |       .check();
      |        ^ Error: locator.check: Test timeout of 30000ms exceeded.
  674 |   await expect(
  675 |     page.getByRole("button", { name: "Import 100 clients" }),
  676 |   ).toBeEnabled();
  677 |   await expect(
  678 |     page.getByRole("checkbox", {
  679 |       name: "Select Synthetic Client 101",
  680 |       exact: true,
  681 |     }),
  682 |   ).toBeDisabled();
  683 |   await page
  684 |     .getByRole("textbox", { name: "Filter clients" })
  685 |     .fill("Client 101");
  686 |   await expect(
  687 |     page.getByRole("button", { name: "Import 100 clients" }),
  688 |   ).toBeEnabled();
  689 |   await page.getByRole("textbox", { name: "Filter clients" }).clear();
  690 |   await expect(
  691 |     page.getByRole("checkbox", {
  692 |       name: "Select Synthetic Client 1",
  693 |       exact: true,
  694 |     }),
  695 |   ).toBeChecked();
  696 |   expect(state.posts).toBe(0);
  697 | });
  698 | 
  699 | test("desktop light visual layout and keyboard dialog focus", async ({
  700 |   page,
  701 | }, testInfo) => {
  702 |   await setup(page);
  703 |   await page
  704 |     .getByRole("checkbox", { name: "Select Saronic Technologies" })
  705 |     .check();
  706 |   await page.evaluate(() => document.fonts.ready);
  707 |   const box = await page.getByRole("dialog").boundingBox();
  708 |   expect(box?.width).toBe(640);
  709 |   expect(
  710 |     await page.evaluate(
  711 |       async () => (await document.fonts.load('14px "Geist Test"')).length,
  712 |     ),
  713 |   ).toBeGreaterThan(0);
  714 |   await page.screenshot({
  715 |     path: testInfo.outputPath("registrant-review-desktop-light.png"),
  716 |     fullPage: true,
  717 |   });
  718 |   await page.keyboard.press("Escape");
  719 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  720 |   await expect(
  721 |     page.getByRole("button", { name: "Import with LDA", exact: true }),
  722 |   ).toBeFocused();
  723 | });
  724 | 
  725 | test("mobile dark review has no horizontal overflow and accessible actions", async ({
  726 |   page,
  727 | }, testInfo) => {
  728 |   await page.setViewportSize({ width: 390, height: 844 });
  729 |   await page.emulateMedia({ colorScheme: "dark" });
  730 |   await setup(page);
  731 |   await page
  732 |     .getByRole("checkbox", { name: "Select Saronic Technologies" })
  733 |     .check();
  734 |   await page.evaluate(() => document.fonts.ready);
  735 |   expect(
  736 |     await page.evaluate(
  737 |       () => document.documentElement.scrollWidth <= window.innerWidth,
  738 |     ),
  739 |   ).toBe(true);
  740 |   const dialog = page.getByRole("dialog");
  741 |   expect(
  742 |     await dialog.evaluate(
  743 |       (element) => getComputedStyle(element).backgroundColor,
  744 |     ),
  745 |   ).toBe("rgb(27, 27, 27)");
  746 |   expect(
  747 |     await dialog.evaluate(
  748 |       (element) => element.scrollWidth <= element.clientWidth,
  749 |     ),
  750 |   ).toBe(true);
  751 |   await expect(
  752 |     page.getByRole("button", { name: "Import 1 client", exact: true }),
  753 |   ).toBeInViewport();
  754 |   await page.screenshot({
  755 |     path: testInfo.outputPath("registrant-review-mobile-dark.png"),
  756 |     fullPage: true,
  757 |   });
  758 | });
  759 | 
```