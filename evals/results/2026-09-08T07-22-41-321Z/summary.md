# Eval run 2026-09-08T07-22-41-321Z
Model: openai/gpt-oss-120b · Cases: 62
Totals: 0 OK · 5 CHECK · 57 ERROR


## elderly-001 · elderly · CHECK
_Elderly caller speaks slowly, mixes Hindi, forgets details_
- ❌ missing tools: book_appointment
**U:** Beta, main... uh... doctor sahab se milna chahta hoon, ghutne mein dard hai... kaafi din se
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Friday 5 Sept, 9 am, 9:30 am, or 12:30 pm. Which one works for you?
**U:** Haan haan, kal shaam thik hai
_tool → check_availability({"count":3,"preference":"evening","urgency":"normal"})_
**A:** We have Friday 5 Sept at 6 pm or 7 pm. Which one would you like?
**U:** Mera naam Ram Lal hai... phone number... arre ek minute... 9 8 7 6... haan 5 4 3 2 1 0
**A:** Great, Ram Lal. Which time works for you—6 pm or 7 pm?

## elderly-002 · elderly · CHECK
_Elderly repeats himself, needs patient handling_
- ❌ missing tools: book_appointment
**U:** Hello beta, kya main doctor se appointment le sakta hoon?
**A:** Sure, kya problem hai?
**U:** Chest mein thoda pain hai lekin bahut serious nahi, bas thoda... kya bataun
_tool → check_availability({"count":3,"preference":"any","urgency":"urgent"})_
**A:** Friday 5 September, 9 am, ya 9:30 am, ya 12:30 pm — aapko kaunsa theek rahega?
**U:** Haan haan appointment book kar do koi bhi time chalega
**A:** The first slot, Friday 5 September at 9 am, will be set. Aapka naam kya hai?

## mother-child-001 · mother-child · ERROR
```
Error: openai 400: {"error":{"message":"Tool call validation failed: tool call validation failed: attempted to call tool 'endCall' which was not in request.tools","type":"invalid_request_error","code":"tool_use_failed","failed_generation":"{\"name\": \"endCall\", \"arguments\": {}}"}}
```

## mother-child-002 · mother-child · CHECK
_Mother of infant with ear pain_
- ❌ missing tools: book_appointment
**U:** My baby has been crying all night, ear pain lag raha hai, please earliest slot
_tool → check_availability({"count":3,"preference":"any","urgency":"urgent"})_
**A:** Sure, humare paas Friday 9:00 am ya 9:30 am ka slot hai. Aapko kaunsa theek rahega?
**U:** Priya, 9873452189, baby is 10 months old
**A:** Aap 9:00 am ka slot chahenge ya 9:30 am?

## hinglish-001 · hinglish · CHECK
_Standard Hinglish booking with reason_
- ❌ missing tools: book_appointment
**U:** Namaste, mujhe kal shaam ko appointment chahiye, thoda headache hai 3 din se
_tool → check_availability({"count":3,"preference":"evening","urgency":"normal"})_
**A:** Kal shaam ke liye do slots available hain: Friday 5 Sept 6:00 pm, ya Friday 5 Sept 7:00 pm. Aap kaunsa pasand karenge?

## hinglish-002 · hinglish · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197117, Requested 4254. Please try again in 9m52.272s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## broken-english-001 · broken-english · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196969, Requested 3464. Please try again in 3m7.055999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## broken-english-002 · broken-english · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196820, Requested 3740. Please try again in 4m1.92s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## rushed-professional-001 · rushed-professional · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196672, Requested 3473. Please try again in 1m2.639999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## rushed-professional-002 · rushed-professional · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196616, Requested 3701. Please try again in 2m16.944s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## indecisive-001 · indecisive · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199658, Requested 3625. Please try again in 23m38.255999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## quiet-speaker-001 · quiet-speaker · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199510, Requested 3539. Please try again in 21m57.168s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## quiet-speaker-002 · quiet-speaker · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199362, Requested 3346. Please try again in 19m29.856s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## clear-emergency-001 · clear-emergency · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199215, Requested 3372. Please try again in 18m37.584s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## clear-emergency-002 · clear-emergency · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199067, Requested 3525. Please try again in 18m39.744s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## clear-emergency-003 · clear-emergency · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198919, Requested 3579. Please try again in 17m59.136s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## ambiguous-emergency-001 · ambiguous-emergency · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198771, Requested 3551. Please try again in 16m43.104s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## ambiguous-emergency-002 · ambiguous-emergency · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198622, Requested 3554. Please try again in 15m40.032s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## plain-fever-001 · plain-fever · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198474, Requested 3515. Please try again in 14m19.248s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## plain-fever-002 · plain-fever · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198326, Requested 3549. Please try again in 13m30s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## location-question-001 · location-question · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198178, Requested 3585. Please try again in 12m41.616s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## location-question-002 · location-question · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198031, Requested 3570. Please try again in 11m31.632s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## abusive-001 · abusive · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197883, Requested 3544. Please try again in 10m16.464s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## abusive-002 · abusive · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197734, Requested 3548. Please try again in 9m13.824s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## interrupting-001 · interrupting · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197587, Requested 3568. Please try again in 8m18.96s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## silent-001 · silent · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197438, Requested 3568. Please try again in 7m14.592s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## silent-002 · silent · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197290, Requested 3562. Please try again in 6m8.063999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## wrong-doctor-001 · wrong-doctor · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197142, Requested 3597. Please try again in 5m19.248s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## wrong-doctor-002 · wrong-doctor · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196994, Requested 3562. Please try again in 4m0.191999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## refund-complaint-001 · refund-complaint · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196846, Requested 3566. Please try again in 2m57.984s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## refund-complaint-002 · refund-complaint · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196698, Requested 3587. Please try again in 2m3.12s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## past-date-001 · past-date · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196550, Requested 3579. Please try again in 55.727999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## past-date-002 · past-date · CHECK
_2 AM request_
- ❌ missing tools: check_availability, book_appointment
**U:** Book me at 2 AM tonight, jaldi hai
**A:** Sorry, hum clinic sirf 9 AM se 8 PM tak hi khulte hain, 2 AM ka slot nahi hai. Aapka kya reason hai appointment ka?

## no-preference-001 · no-preference · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196874, Requested 3534. Please try again in 2m56.256s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## no-preference-002 · no-preference · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196724, Requested 3671. Please try again in 2m50.64s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## off-hour-request-001 · off-hour-request · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196576, Requested 3560. Please try again in 58.752s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## phone-across-turns-001 · phone-across-turns · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199572, Requested 3784. Please try again in 24m9.792s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## phone-across-turns-002 · phone-across-turns · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199424, Requested 3552. Please try again in 21m25.632s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## wrong-phone-length-001 · wrong-phone-length · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199275, Requested 3665. Please try again in 21m10.08s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## wrong-phone-length-002 · wrong-phone-length · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199128, Requested 3536. Please try again in 19m10.848s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## name-spelled-out-001 · name-spelled-out · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198979, Requested 3549. Please try again in 18m12.096s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## family-member-001 · family-member · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198831, Requested 3580. Please try again in 17m21.551999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## family-member-002 · family-member · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198683, Requested 3535. Please try again in 15m58.175999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## after-booking-chit-001 · after-booking-chit · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198535, Requested 3554. Please try again in 15m2.448s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-fees-001 · qa-fees · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198387, Requested 3550. Please try again in 13m56.783999999s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-fees-002 · qa-fees · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198239, Requested 3577. Please try again in 13m4.512s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-doctor-bio-001 · qa-doctor-bio · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 198091, Requested 3558. Please try again in 11m52.368s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-doctor-bio-002 · qa-doctor-bio · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197943, Requested 3545. Please try again in 10m42.816s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-walk-in-001 · qa-walk-in · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197794, Requested 3550. Please try again in 9m40.608s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-parking-insurance-001 · qa-parking-insurance · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197646, Requested 3534. Please try again in 8m29.76s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-parking-insurance-002 · qa-parking-insurance · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197499, Requested 3539. Please try again in 7m28.416s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-language-001 · qa-language · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197350, Requested 3557. Please try again in 6m31.824s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-timings-001 · qa-timings · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197201, Requested 3528. Please try again in 5m14.928s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-timings-002 · qa-timings · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197052, Requested 3517. Please try again in 4m5.808s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-child-family-001 · qa-child-family · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196904, Requested 3574. Please try again in 3m26.496s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-online-consult-001 · qa-online-consult · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196756, Requested 3551. Please try again in 2m12.624s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-reschedule-001 · qa-reschedule · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 196606, Requested 3563. Please try again in 1m13.008s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-followup-001 · qa-followup · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199635, Requested 3615. Please try again in 23m24s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-lab-vaccine-001 · qa-lab-vaccine · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199486, Requested 3366. Please try again in 20m32.064s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-lab-vaccine-002 · qa-lab-vaccine · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199337, Requested 3552. Please try again in 20m48.048s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-mixed-language-001 · qa-mixed-language · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199190, Requested 3547. Please try again in 19m42.384s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## qa-mixed-language-002 · qa-mixed-language · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 199041, Requested 3530. Please try again in 18m30.672s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```
