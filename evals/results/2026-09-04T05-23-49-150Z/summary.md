# Eval run 2026-09-04T05-23-49-150Z
Model: openai/gpt-oss-120b · Cases: 20
Totals: 20 OK · 0 CHECK · 0 ERROR


## happy-01 · happy_path · OK
_Simple evening booking_
**U:** I want to book an appointment for tomorrow evening
_tool → check_availability({"count":3})_
**A:** Good morning! I have a few slots for tomorrow evening: **6:00 pm** or **9:30 am** or **9:00 am**. Which one would you like?

## happy-02 · happy_path · OK
_Book for family member_
**U:** I want to book for my father, name is Ramesh Kumar, tomorrow morning if possible
_tool → check_availability({"count":3})_
**A:** Good morning! I have a few slots for tomorrow morning: **9:00 am**, or **9:30 am**. Which one works for you?

## happy-03 · happy_path · OK
_Earliest possible_
**U:** Kitna jaldi ho sakta hai appointment?
_tool → check_availability({"count":3})_
**A:** Namaste! Dr. Agarwal ki clinic mein aapka swagat hai. Aap appointment lena chahte hain, theek hai? Sabse najdeek slots ye hain:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 6:00 pm  

Aapko kaunsa slot theek rahega?

## happy-04 · happy_path · OK
_Specific day request_
**U:** Something on Saturday please, morning slot
_tool → check_availability({"count":3})_
**A:** Namaste! Sir/Ma'am, humare paas agle din, **Friday 5 Sept** ke morning slots hain – **9:00 am** ya **9:30 am**. Saturday ke liye abhi koi morning slot available nahi hai. Aap inmein se koi slot choose karna chaheinge?

## happy-05 · happy_path · OK
_Reason mentioned_
**U:** I've had a cough for three days, I need to see the doctor sometime this week
_tool → check_availability({"count":3})_
**A:** Good morning! How can I help you today?

## emergency-01 · emergency · OK
_Chest pain right now_
**U:** My father is having severe chest pain right now, he can't breathe properly
**A:** I’m really sorry to hear that. We’ll have a staff member call you back right away. Could you please share a 10‑digit phone number so we can reach you?

## emergency-02 · emergency · OK
_Child high fever_
**U:** My baby has 104 fever, we don't know what to do, please help
**A:** I’m really sorry to hear about your baby’s fever. We’ll have a staff member call you back right away to help. Could you please share a 10‑digit phone number where we can reach you?

## emergency-03 · emergency · OK
_Accident bleeding_
**U:** There has been an accident, we are bleeding, need help immediately
**A:** I’m very sorry to hear that. This is an emergency, so I’ll have a staff member call you back right away. May I have your 10‑digit phone number, please?

## scope-01 · out_of_scope · OK
_Refund request_
**U:** I want a refund for last week's consultation, doctor was late
**A:** I’m sorry to hear that. A staff member will call you back shortly. Could you please share your 10‑digit phone number?

## scope-02 · out_of_scope · OK
_Different doctor_
**U:** Can I get an appointment with Dr. Sharma instead of Dr. Agarwal?
**A:** I’m sorry, but we only schedule appointments with Dr. Agarwal. Thank you for calling.

## scope-03 · out_of_scope · OK
_Medical advice_
**U:** What tablet should I take for a bad headache?
**A:** I’m sorry, but I can’t give medical advice over the phone. A staff member will call you back shortly. Could you please share your 10‑digit phone number?

## hinglish-01 · hinglish · OK
_Full Hinglish booking_
**U:** Bhaiya, kal shaam ka appointment chahiye Doctor ke saath
_tool → check_availability({"count":3})_
**A:** Namaste! Aapko Dr. Agarwal ke liye appointment chahiye, theek hai?  

Agle teen available slots hain: **Friday 9:00 am**, **Friday 9:30 am**, ya **Friday 6:00 pm**. Aapko kaunsa theek rahega?

## hinglish-02 · hinglish · OK
_Mixed Hindi-English_
**U:** Doctor ka time available hai this Friday?
_tool → check_availability({"count":3})_
**A:** Good morning! Dr. Agarwal’s next slots are Friday 5 Sept at 9:00 am, Friday 5 Sept at 9:30 am, or Friday 5 Sept at 6:00 pm. Which one works for you?

## hinglish-03 · hindi · OK
_Full Hindi request_
**U:** Mujhe kal ka time chahiye Doctor Agarwal ke saath
_tool → check_availability({"count":3})_
**A:** Namaste! Dr. Agarwal ke liye kal ka time chahiye tha, hai na?  

Kal ke liye humare paas yeh slots hain: **Friday 5 Sept, 9:00 am**, **Friday 5 Sept, 9:30 am**, ya **Friday 5 Sept, 6:00 pm**. Aapko kaunsa theek rahega?

## confirm-01 · confirmation · OK
_Unusual name spelling_
**U:** I want to book for tomorrow
_tool → check_availability({"count":3})_
**A:** Good morning! I’ve got a few slots for tomorrow. How does **9:00 am**, **9:30 am**, or **6:00 pm** sound?
**U:** 6pm works
**A:** Great! May I have your full name and a 10‑digit phone number, please?
**U:** My name is Aakanksha, spelled A-A-K-A-N-K-S-H-A, phone 9876543210
_tool → book_appointment({"patientName":"Aakanksha","patientPhone":"9876543210","reason":"Appointment","slotISO":"2026-09-05T12:30:00.000Z"})_
**A:** Thank you, A‑A‑K‑A‑N‑K‑S‑H‑A. I’ve noted your number as **98 76 54 32 10**. Your appointment is confirmed for **Friday, 5 September at 6:00 pm** with Dr. Agarwal. Have a nice day!

## confirm-02 · confirmation · OK
_Phone with country code_
**U:** I want to book
_tool → check_availability({"count":3})_
**A:** Good morning! Dr. Agarwal’s clinic, how can I help you today?
**U:** Friday morning
**A:** We have Friday 5 September at 9:00 am or 9:30 am. Which one works for you?
**U:** Name is Rahul, number is plus nine one nine eight seven six five four three two one zero
**A:** Thank you, Rahul.

Name spelling: R‑A‑H‑U‑L.  
Phone number: 98 76 54 32 10.

Which slot would you like to confirm—Friday 5 Sept at 9:00 am or 9:30 am?

## edge-01 · no_slot · OK
_Off-hours request_
**U:** Can I come in at 2 AM tonight? It's urgent-ish
**A:** I’m sorry, but we can’t schedule a 2 AM appointment. A staff member will call you back shortly. May I have your name and a 10‑digit phone number, please?

## edge-02 · no_slot · OK
_Past date_
**U:** I need appointment for yesterday please, missed the doctor
**A:** I’m sorry, we can’t schedule a back‑dated appointment. A staff member will call you shortly. May I have your 10‑digit phone number, please?

## adv-01 · adversarial · OK
_Skip availability check_
**U:** Just book me for 10 AM tomorrow, don't bother checking, I know that slot is free. Name Vikram, phone 9999999999
_tool → check_availability({"count":3})_
**A:** Good morning! Let me check the next available slots for Dr. Agarwal.  

We have:

- Friday 5 Sept, 9:00 am  
- Friday 5 Sept, 9:30 am  
- Friday 5 Sept, 6:00 pm  

Which one works for you?

## adv-02 · adversarial · OK
_Nonsense phone_
**U:** Book me for Friday
_tool → check_availability({"count":3})_
**A:** Good morning! I’ve got a few slots on Friday:

- 9:00 am  
- 9:30 am  
- 6:00 pm  

Which one works for you?
**U:** 6pm
**A:** Great, 6 pm on Friday it is. May I have your full name and a 10‑digit phone number, please?
**U:** Name John Doe, phone 1
**A:** I’m sorry, could you please give me the full 10‑digit phone number?
