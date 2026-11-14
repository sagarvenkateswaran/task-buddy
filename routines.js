// Edit routines here (shared by /morning and /bedtime)
const WEEKEND=()=>[0,6].includes(new Date().getDay());
const ENDINGS={"morning routine":()=>WEEKEND()?"GOODJOB":"You are ready to go out. Have a great day!"};
// Southampton, PA fallback coords; getWeather may rebuild URL from geolocation
const WEATHER_FALLBACK_LAT=40.1773, WEATHER_FALLBACK_LON=-75.0377;
const WEATHER_URL=`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_FALLBACK_LAT}&longitude=${WEATHER_FALLBACK_LON}&current=temperature_2m&temperature_unit=fahrenheit`;
const LISTS={
 // Step formats: "text" = wait for done.  {text, wait:ms, auto:true} = speak, auto-advance after wait (done skips ahead).
 // {text, wait:ms, auto:'orDone'} = advance on done OR after wait.  Optional: pre:ms (silent wait before speaking), repeat:n, gap:ms (between repeats).
 // hints:['…'] = mid-step spoken nudges on each repeat.  {hold:true, prompt, gap} = wait forever for Done.
 // shower:'enter'|'in'|'off'|'exit' = timed in-shower steps (no Done) then the exit Done once out. See shower block.
 // once:true = speak once, no reminders. silent:true = screen only, wait for Done (no TTS).
 // Conditional: days:[0,2,4] = only those weekdays (0=Sun).  tempBelow:60 = only if outside °F is below that.
 // {weather:true} = jacket reminder from live temperature (skipped if 65F+).
 "morning routine":[
  {lead:"Go to Mukki.",text:"Are you done? If you are, press Done.",pre:300000,repeat:5,gap:60000,wait:60000,auto:true}, // asks at 5,6,7,8,9 min; moves on at 10 min or on yes/done
  "Stand up and wipe yourself.",
  "Flush.",
  "Wash your hands.",
  // Shave: Sunday, Tuesday, Thursday (before shower)
  {text:"You need to shave today. Put on shaving gel.",days:[0,2,4]},
  {text:"Get a clean new razor and shave yourself. Focus and do it slowly. Don't cut yourself.",days:[0,2,4]},
  // Shower block (all days). SAFETY: the phone stays OUTSIDE the shower. Nothing inside the shower needs a Done press.
  // shower:'enter'|'in'|'off' = timed, repeated, loud spoken reminders that advance on their own (Done is ignored).
  // shower:'exit' = the ONLY Done in the shower block, once he is out. The water mic is advisory only: it never skips or shortens a step.
  // Timings follow the first version's timed shower (about 2 min soap, 2 min rinse, 2 min face, then water off).
  {text:"Leave your phone outside. Get into the shower.",wait:30000,auto:true,repeat:3,gap:15000,hints:["Get the water nice and warm.","Step all the way in."],shower:'enter'},
  {text:"Put soap on.",repeat:4,gap:25000,wait:45000,auto:true,hints:["Keep soaping your arms and legs.","Soap your chest and back too.","Don't forget under your arms.","Keep soaping. Take your time."],shower:'in'},
  {text:"Rinse off the soap.",repeat:4,gap:25000,wait:30000,auto:true,hints:["Rinse your arms and legs.","Rinse your face and hair.","Make sure all the soap is gone."],shower:'in'},
  {text:"Wash your face.",repeat:3,gap:25000,wait:45000,auto:true,hints:["Don't forget your face.","Wash your face gently."],shower:'in'},
  {text:"Turn off the shower.",repeat:3,gap:15000,wait:20000,auto:true,hints:["Turn the water all the way off.","Make sure the shower is off."],shower:'off'},
  {text:"Dry yourself and step out of the shower. When you are out, press Done.",hold:true,prompt:"When you are out of the shower, press Done.",gap:60000,shower:'exit'},
  "Put the towel on.",
  "Put deodorant on.",
  {text:"Put on aftershave.",days:[0,2,4]},
  "Go out of the bathroom to your room, and then press Done.",
  "Put on your underwear, and then press Done.",
  "Put on your shirt, and then press Done.",
  "Put on your pants, and then press Done.",
  {text:"Put on your light jacket, and then press Done.",tempBelow:60}, // outside < 60°F
  "Put the towel back inside the bathroom.",
  {weather:true},
  {text:"Put on your socks.",days:[1,2,3,4,5]}, // weekdays only
  "Comb your hair.",
  // Sunday laundry after combing, then silent breakfast (no Swami on laundry day)
  {text:"Take your phone and laundry downstairs.",days:[0]},
  {text:"Load the laundry into the washer.",days:[0]},
  {text:"Add detergent.",days:[0]},
  {text:"Turn on the washer.",days:[0]},
  // Non-Sunday: once Swami then silent breakfast. Sunday (laundry): washer → silent breakfast (no Swami).
  // silent: screen only until Done (no TTS/nudges). Quiet until after breakfast; voice resumes at plates.
  {text:"Go downstairs and do 7 Swami Namaskarams. Take your phone with you.",once:true,days:[1,2,3,4,5,6]},
  {text:"Eat breakfast.",silent:true},
  {text:"Put the plates in the sink.",days:[0,6]},
  {text:"Pick up your vitamins in your hand, put them in your mouth, and swallow them with some water, and then press Done.",days:[0,6]},  // weekend
  {text:"Put the plates in the sink, wash your hands, and rinse your mouth.",days:[1,2,3,4,5]},
  {text:"Pick up your vitamins in your hand, put them in your mouth, and swallow them with some water, and then press Done.",days:[1,2,3,4,5]},
  {text:"Put on your shoes.",days:[1,2,3,4,5]},
  // Heavy winter jacket in mudroom when < 40°F (any day; after shoes on weekdays, after vitamins on weekends)
  {text:"Put on your heavy winter jacket, and then press Done.",tempBelow:40}],
 "bedtime routine":[   // calm:true list -> soft praise, soothing ending. speak: = pronunciation only
  "Turn on the light and the exhaust in the bathroom, and then press Done.",
  {text:"Go moochcha.",speak:"Go mooch-cha.",wait:120000,auto:'orDone',hardStop:"Time's up."}, // hard stop at 2 min
  {text:"Put it in.",wait:60000,auto:'orDone'},
  {text:"Flush.",wait:60000,auto:'orDone'},
  "Wash your hands.",
  {text:"Brush your teeth.",wait:120000,auto:'orDone'},
  {text:"Rinse your mouth.",wait:30000,auto:'orDone'},
  {text:"Wash your hands.",wait:30000,auto:'orDone'},
  "Turn off the light and the exhaust in the bathroom, and then press Done.",
  {text:"Press Done, and then go to bed. Good night!",wait:15000,auto:'orDone'}],
 "make a sandwich":["Wash your hands","Get two slices of bread","Spread the butter","Add the filling","Put the slices together","Put things back in the fridge"],
 "laundry":["Put clothes in the washer","Add one scoop of detergent","Close the door and press start","When it beeps, move clothes to the dryer","Fold your clothes"]
};
