# Eval run 2026-09-04T05-23-05-083Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 9 OK · 0 CHECK · 11 ERROR


## happy-01 · happy_path · OK
_Simple evening booking_
**U:** I want to book an appointment for tomorrow evening
_tool → check_availability({"count":3})_
**A:** Good morning! I have a few slots for tomorrow evening. How does **6:00 pm** sound, or would you prefer another time?

## happy-02 · happy_path · OK
_Book for family member_
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
_tool → check_availability({"count":3})_
**A:** Good morning! I have two morning slots for tomorrow:

- 9:00 am, or  
- 9:30 am.

Which one would you like to choose?

## happy-03 · happy_path · OK
_Earliest possible_
**U:** Kitna jaldi ho sakta hai appointment?
_tool → check_availability({"count":3})_
**A:** Namaste! Dr. Agarwal ke clinic mein appointment chahte hain, theek hai. Sabse jaldi aapke liye ye slots hain:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 6:00 pm  

Aapko kaunsa slot theek rahega?

## happy-04 · happy_path · OK
_Specific day request_
**U:** Something on Saturday please, morning slot
_tool → check_availability({"count":3})_
**A:** Good morning! We have a few slots open:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 6:00 pm  

Which one works for you?

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3})_
**A:** Good morning! I’m happy to help you book an appointment with Dr. Agarwal. The next available slots are:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 6:00 pm  

Which one works for you?

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** I'm really sorry to hear that. This sounds urgent, so I'll have a staff member call you back right away. Could you please give me a 10‑digit phone number where we can reach you?

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** I’m really sorry to hear that. This is an emergency, so I’ll have a staff member call you back right away. Could you please give me your 10‑digit phone number?

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** I’m really sorry to hear that. This is an emergency, so I’ll have a staff member call you back right away. Could you please give me your 10‑digit phone number?

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear about that. A staff member will call you back shortly. May I have your 10‑digit phone number, please?

## scope-02 · out_of_scope · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7815, Requested 736. Please try again in 4.1325s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## scope-03 · out_of_scope · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7799, Requested 637. Please try again in 3.27s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## hinglish-01 · hinglish · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7783, Requested 643. Please try again in 3.195s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## hinglish-02 · hinglish · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7697, Requested 705. Please try again in 3.015s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## hinglish-03 · hindi · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7671, Requested 642. Please try again in 2.3475s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## confirm-01 · confirmation · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7662, Requested 703. Please try again in 2.7375s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## confirm-02 · confirmation · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7649, Requested 724. Please try again in 2.7975s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## edge-01 · no_slot · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7631, Requested 733. Please try again in 2.73s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## edge-02 · no_slot · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7615, Requested 637. Please try again in 1.89s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## adv-01 · adversarial · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7594, Requested 727. Please try again in 2.4075s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```

## adv-02 · adversarial · ERROR
```
Error: openai 429: {"error":{"message":"Rate limit reached for model `openai/gpt-oss-120b` in organization `org_01m1ndt442evgsxeaab1qcat51` service tier `on_demand` on tokens per minute (TPM): Limit 8000, Used 7553, Requested 701. Please try again in 1.905s. Need more tokens? Upgrade to Dev Tier today at https://console.groq.com/settings/billing","type":"tokens","code":"rate_limit_exceeded"}}
```
