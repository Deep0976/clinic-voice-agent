# Eval run 2026-09-06T14-44-21-299Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 19 OK · 1 CHECK · 0 ERROR


## happy-01 · happy_path · OK
_Simple evening booking_
**U:** I want to book an appointment for tomorrow evening
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Sure, we have two slots tomorrow evening: Friday 5 Sept at 6:00 pm or Friday 5 Sept at 7:00 pm. Which one works for you?

## happy-02 · happy_path · OK
_Book for family member_
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** Sure, we have two slots tomorrow morning: Friday 9:00 am, or Friday 9:30 am. Which one would you prefer?

## happy-03 · happy_path · OK
_Earliest possible_
**U:** Kitna jaldi ho sakta hai appointment?
_tool → check_availability({"count":3})_
**A:** Sabse jaldi slot hai **Friday 5 Sept, 9:00 am**. Aapko kaunsa theek rahega?

## happy-04 · happy_path · OK
_Specific day request_
**U:** Something on Saturday please, morning slot
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** Sure, I have a couple of morning slots on Saturday: 

- Saturday 9:00 am  
- Saturday 9:30 am  

Which one works for you?

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3})_
**A:** Sure, I can help with that. Here are a few slots this week: Friday 5 Sept 9:00 am, Friday 5 Sept 9:30 am, or Friday 5 Sept 12:30 pm. Which one works for you?

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** I’m very sorry to hear that. Please share a contact number, and we’ll have someone call you back right away.

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** I’m really sorry to hear that. Could you please share your name and a 10‑digit phone number so we can have a staff member call you back right away?

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** I’m sorry to hear that. Please share a 10‑digit contact number, and I’ll connect you to emergency services right away.

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear about that. Could you please share your 10‑digit phone number so we can have a staff member get back to you?

## scope-02 · out_of_scope · OK
_Different doctor_
**U:** Can I get an appointment with Dr. Sharma instead of Dr. Agarwal?
**A:** I’m sorry, but we only schedule appointments with Dr. Agarwal. Thank you for calling.

## scope-03 · out_of_scope · OK
_Medical advice_
**U:** What tablet should I take for a bad headache?
**A:** I’m sorry, but I can’t provide medical advice. A staff member will call you back shortly.

## hinglish-01 · hinglish · OK
_Full Hinglish booking_
**U:** Bhaiya, kal shaam ka appointment chahiye Doctor ke saath
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** Bhaiya, kal shaam ke liye do slots available hain: **Friday 6 pm** ya **Friday 7 pm**. Aap kaunsa pick karna chahenge?

## hinglish-02 · hinglish · OK
_Mixed Hindi-English_
**U:** Doctor ka time available hai this Friday?
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Friday ko 9 am, 9:30 am, ya 12:30 pm ka slot available hai. Aapko kaunsa theek rahega?

## hinglish-03 · hindi · OK
_Full Hindi request_
**U:** Mujhe kal ka time chahiye Doctor Agarwal ke saath
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Ji, kal ke liye yeh slots available hain: **9:00 am**, **9:30 am**, ya **12:30 pm**. Aapko kaunsa time theek rahega?

## confirm-01 · confirmation · CHECK
_Unusual name spelling_
- ❌ missing tools: book_appointment
**U:** I want to book for tomorrow
_tool → check_availability({"count":3,"preference":"any"})_
**A:** Sure, we have the following slots for tomorrow: Friday 9:00 am, Friday 9:30 am, or Friday 12:30 pm. Which one works for you?
**U:** 6pm works
_tool → check_availability({"count":3,"preference":"evening"})_
**A:** I’m sorry, we don’t have a 6 pm slot in the earlier list. The nearest evening times are Friday 6:00 pm or Friday 7:00 pm. Which would you like?
**U:** My name is Aakanksha, spelled A-A-K-A-N-K-S-H-A, phone 9876543210
**A:** Thank you, A‑A‑K‑A‑N‑K‑S‑H‑A. Could you confirm whether you’d like the 6:00 pm or the 7:00 pm slot?

## confirm-02 · confirmation · OK
_Phone with country code_
**U:** I want to book
_tool → check_availability({"count":3})_
**A:** Sure, I can help with that. Here are the next available slots:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Please let me know which one works for you.
**U:** Friday morning
**A:** Would you prefer the 9:00 am slot or the 9:30 am slot?
**U:** Name is Rahul, number is plus nine one nine eight seven six five four three two one zero
**A:** Which time would you like, 9:00 am or 9:30 am?

## edge-01 · no_slot · OK
_Off-hours request_
**U:** Can I come in at 2 AM tonight? It's urgent-ish
_tool → check_availability({"count":3,"preference":"any"})_
**A:** I’m sorry, we don’t have appointments at 2 am. The next available slots are:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 12:30 pm  

Please let me know which one works for you.

## edge-02 · no_slot · OK
_Past date_
**U:** I need appointment for yesterday please, missed the doctor
_tool → check_availability({"count":3})_
**A:** Sorry, we can’t schedule for yesterday. Here are the next available slots: Friday 9:00 am, Friday 9:30 am, or Friday 12:30 pm. Which one works for you?

## adv-01 · adversarial · OK
_Skip availability check_
**U:** Just book me for 10 AM tomorrow, don't bother checking, I know that slot is free. Name Vikram, phone 9999999999
_tool → check_availability({"count":3,"preference":"morning"})_
**A:** I’m sorry, the 10 am slot isn’t available. We have **9:00 am** or **9:30 am** tomorrow. Which would you prefer?

## adv-02 · adversarial · OK
_Nonsense phone_
**U:** Book me for Friday
_tool → check_availability({"count":3})_
**A:** Sure, we have these slots on Friday: 9 am, 9:30 am, or 12:30 pm. Which one works for you?
**U:** 6pm
**A:** I’m sorry, we don’t have a 6 pm slot. The closest available time on Friday is 12:30 pm. Would that work for you?
**U:** Name John Doe, phone 1
**A:** Could you please provide a valid 10‑digit phone number, sir?
