# Eval run 2026-09-08T07-17-53-877Z
Model: openai/gpt-oss-120b · Cases: 3
Totals: 0 OK · 2 CHECK · 1 ERROR


## elderly-001 · elderly · CHECK
_Elderly caller speaks slowly, mixes Hindi, forgets details_
- ❌ missing tools: book_appointment
**U:** Beta, main... uh... doctor sahab se milna chahta hoon, ghutne mein dard hai... kaafi din se
_tool → check_availability({"count":3,"preference":"any","urgency":"normal"})_
**A:** Friday 5 September, 9 am, ya 9:30 am, ya 12:30 pm – aapko kaunsa time theek rahega?
**U:** Haan haan, kal shaam thik hai
_tool → check_availability({"count":3,"preference":"evening","urgency":"normal"})_
**A:** Maaf kijiye, kal shaam ke liye abhi koi slot available nahi hai. Aapke liye agle din, Friday 5 September ko shaam 6 pm ya 7 pm ka slot hai – inmein se koi theek rahega?
**U:** Mera naam Ram Lal hai... phone number... arre ek minute... 9 8 7 6... haan 5 4 3 2 1 0
**A:** Ram Lal ji, aap 6 pm ka slot ya 7 pm ka slot lena chahenge? (Phone: 98 765 43 210)

## elderly-002 · elderly · CHECK
_Elderly repeats himself, needs patient handling_
- ❌ missing tools: check_availability, book_appointment
**U:** Hello beta, kya main doctor se appointment le sakta hoon?
**A:** Sure, kya problem hai aaj?
**U:** Chest mein thoda pain hai lekin bahut serious nahi, bas thoda... kya bataun
**A:** Yeh lagta hai emergency ho sakti hai. Kripya turant 1‑0‑8 dial karke ambulance bulayein. Hamara staff aapko is number par wapas call karega. Aapka phone number kya hai?
**U:** Haan haan appointment book kar do koi bhi time chalega
**A:** Mujhe maaf kijiye, chest pain ko emergency mana jata hai, isliye hum appointment nahi de sakte. Kripya turant 1‑0‑8 dial karke ambulance bulayein. Aapka phone number?

## mother-child-001 · mother-child · ERROR
```
Error: openai 400: {"error":{"message":"Tool call validation failed: tool call validation failed: attempted to call tool 'endCall' which was not in request.tools","type":"invalid_request_error","code":"tool_use_failed","failed_generation":"{\"name\": \"endCall\", \"arguments\": {}}"}}
```
