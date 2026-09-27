/* ==========================================================
   ics.js — "Add to my calendar": every exam and submission in EVENTS as
   an .ics file, so the phone's own calendar reminds you of them.
   · Times are Madrid time (with its VTIMEZONE), whatever zone the phone is in.
   · Dates without a day (noDay) are left out: a reminder on the wrong day
     is worse than none. They go in once data.js has the day.
   · Each event keeps the same UID, so importing again updates it
     instead of duplicating it (in the calendars that honour UIDs).
   ========================================================== */
const ICS_TZ=[
  "BEGIN:VTIMEZONE","TZID:Europe/Madrid",
  "BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST",
  "DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
  "BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET",
  "DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD",
  "END:VTIMEZONE"];

/* what goes into the calendar: graded things with a known day */
const icsEvents=()=>EVENTS.filter(e=>isAssessment(e)&&!e.noDay&&SUBJECTS[e.subject]).sort(byDate);
const icsPending=()=>EVENTS.filter(e=>isAssessment(e)&&e.noDay&&SUBJECTS[e.subject]).length;

/* text values escape \ ; , and newlines (RFC 5545 §3.3.11) */
const icsText=s=>String(s).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
/* lines longer than 75 bytes continue on the next one after a space; never split a character */
function icsFold(line){
  const out=[]; let cur="", n=0;
  for(const ch of line){
    const b=new TextEncoder().encode(ch).length;
    if(n+b>75){ out.push(cur); cur=" "; n=1; }
    cur+=ch; n+=b;
  }
  out.push(cur);
  return out.join("\r\n");
}
const icsDay=k=>k.replace(/-/g,"");
/* "09:00–10:30" → [540, 630]; anything else (e.g. "Abre lunes 9:00…") → null */
function icsSpan(time){
  const m=/^\s*(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})\s*$/.exec(time||"");
  return m?[+m[1]*60+ +m[2], +m[3]*60+ +m[4]]:null;
}
const icsClock=m=>String(Math.floor(m/60)).padStart(2,"0")+String(m%60).padStart(2,"0")+"00";
const icsAlarm=(trigger,text)=>["BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+icsText(text),trigger,"END:VALARM"];

function buildICS(events=icsEvents(), now=new Date()){
  const stamp=now.toISOString().replace(/[-:]/g,"").replace(/\.\d+/,"");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Nolan//with-nolan//"+(LANG==="en"?"EN":"ES"),
    "CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:"+icsText(t("ics.calName")),"X-WR-TIMEZONE:Europe/Madrid",...ICS_TZ];
  events.forEach(e=>{
    const S=SUBJECTS[e.subject], span=e.until?null:icsSpan(e.time);
    const title=typeName(e.type)+" · "+S.name+": "+e.what;
    const info=[[t("detail.weight"),e.weight]];
    if(e.time&&!span) info.push([t("detail.when"),e.time]);
    if(e.format) info.push([t("detail.format"),e.format]);
    if(e.syllabus) info.push([t("detail.covers"),e.syllabus]);
    lines.push("BEGIN:VEVENT",
      "UID:"+slug(e.subject+" "+e.date+" "+e.what)+"@with-nolan","DTSTAMP:"+stamp);
    if(span) lines.push("DTSTART;TZID=Europe/Madrid:"+icsDay(e.date)+"T"+icsClock(span[0]),
                        "DTEND;TZID=Europe/Madrid:"+icsDay(e.date)+"T"+icsClock(span[1]));
    else lines.push("DTSTART;VALUE=DATE:"+icsDay(e.date),"DTEND;VALUE=DATE:"+icsDay(addDays(lastDay(e),1)));
    lines.push("SUMMARY:"+icsText(title),
      "DESCRIPTION:"+icsText(info.filter(r=>r[1]).map(r=>r[0]+": "+r[1]).join("\n")),
      "CATEGORIES:"+icsText(typeName(e.type)));
    if(e.room) lines.push("LOCATION:"+icsText(e.room+(S.campus?" · "+campusOf(e.subject):"")));
    if(!span) lines.push("TRANSP:TRANSPARENT");
    /* the day before at 9:00 (all-day) or 24 h before, plus one hour before a timed one;
       a window that stays open also warns the day before it closes */
    lines.push(...icsAlarm(span?"TRIGGER:-P1D":"TRIGGER:-PT15H",title));
    if(span) lines.push(...icsAlarm("TRIGGER:-PT1H",title));
    if(e.until) lines.push(...icsAlarm("TRIGGER;RELATED=END:-P1D",t("ics.closes")+" · "+title));
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.map(icsFold).join("\r\n")+"\r\n";
}

/* hands the file to the browser: on a phone, opening it offers to add the events */
function downloadICS(){
  const url=URL.createObjectURL(new Blob([buildICS()],{type:"text/calendar;charset=utf-8"}));
  const a=document.createElement("a");
  a.href=url; a.download="nolan-uc3m.ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
}
