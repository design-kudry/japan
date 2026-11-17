// Compact catalog hours/ticket for Japan itinerary — static, instant, no API.
// Format matches place-meta: hours string + optional price (Бесплатно|Платно|amount).
// Keys = English catalog names from js/data.js DAYS.
const PLACE_HOURS={
'Namba Yasaka Shrine':['Бесплатно','24/7'],
'Kura Sushi Namba':['Платно','11:00–23:00'],
'Dotonbori':['—','24/7'],
'Amerikamura':['—','10:00–20:00'],
'Shinsaibashi-suji':['—','10:00–20:00'],
'Sumiyoshi Taisha':['Бесплатно','6:00–17:00'],
'Osaka Castle':['Платно','9:00–17:00'],
'Nakanoshima Park':['Бесплатно','24/7'],
'Umeda Sky Building':['Платно','9:30–22:30'],
'Den Den Town':['—','10:00–20:00'],
'Shinsekai':['—','10:00–22:00'],
'To-ji':['Платно','8:00–17:00'],
'Tofuku-ji':['Платно','9:00–16:00'],
'Fushimi Inari Taisha':['Бесплатно','24/7'],
'Kiyomizu-dera':['Платно','6:00–18:00'],
'Gion':['—','24/7'],
'Higashiyama':['—','24/7'],
'Nishiki Market':['—','9:00–18:00'],
'Nijo Castle':['Платно','8:45–16:00'],
'Arashiyama Bamboo':['Бесплатно','24/7'],
'Todai-ji':['Платно','7:30–17:30'],
'Nara Park':['Бесплатно','24/7'],
'Universal Studios Japan':['Платно','9:00–21:00'],
'Chureito Pagoda':['Бесплатно','24/7'],
'Lake Kawaguchi':['Бесплатно','24/7'],
'Kachi Kachi Ropeway':['Платно','9:00–16:40'],
'Oishi Park':['Бесплатно','24/7'],
'Saiko Iyashi-no-Sato Nenba':['Платно','9:00–17:00'],
'Oshino Hakkai':['Бесплатно','24/7'],
'Shinjuku Gyoen':['Платно','9:00–16:30'],
'Shinjuku':['—','24/7'],
'Omoide Yokocho':['Платно','17:00–24:00'],
'Kabukicho':['—','24/7'],
'Golden Gai':['Платно','18:00–1:00'],
'Kameido Tenjin Shrine':['Бесплатно','8:00–17:00'],
'Tokyo Skytree':['Платно','10:00–21:00'],
'Sumida Park':['Бесплатно','24/7'],
'Nakamise':['—','9:00–19:00'],
'Senso-ji':['Бесплатно','6:00–17:00'],
'Tokyo National Museum':['Платно','9:30–17:00'],
'Ueno Park':['Бесплатно','5:00–23:00'],
'Akihabara Electric Town':['—','10:00–20:00'],
'Hie Shrine':['Бесплатно','6:00–17:00'],
'Imperial Palace':['Бесплатно','9:00–16:00'],
'Yasukuni Shrine':['Бесплатно','6:00–18:00'],
'Kagurazaka':['—','24/7'],
'Koishikawa Korakuen Garden':['Платно','9:00–17:00'],
'Nezu Shrine':['Бесплатно','6:00–17:00'],
'Yanaka Ginza':['—','10:00–19:00'],
'teamLab Planets TOKYO':['Платно','9:00–22:00'],
'Hamarikyu Gardens':['Платно','9:00–17:00'],
'Azabudai Hills':['—','10:00–21:00'],
'The National Art Center':['Платно','10:00–18:00'],
'Mori Art Museum':['Платно','10:00–22:00'],
'Shibuya Sky':['Платно','10:00–22:30'],
'Hachiko Statue':['Бесплатно','24/7'],
'Shibuya Crossing':['Бесплатно','24/7'],
'Warner Bros. Studio Tour Tokyo':['Платно','9:00–19:00'],
'Meiji Shrine':['Бесплатно','6:00–18:00'],
'Shimokitazawa':['—','11:00–20:00'],
'Engaku-ji':['Платно','8:00–16:30'],
'Kencho-ji':['Платно','8:30–16:30'],
'Tsurugaoka Hachimangu':['Бесплатно','6:00–20:00'],
'Hokoku-ji':['Платно','9:00–16:00'],
'Kotoku-in · Great Buddha':['Платно','8:00–16:30'],
'Hase-dera':['Платно','8:00–16:30'],
'Enoshima Shrine':['Бесплатно','8:30–16:30'],
};

/** Attach catalog hours/price if missing. Keeps existing values. */
function applyPlaceHours(place){
 const key=place.nameEn||place.name;
 const row=PLACE_HOURS[key];
 if(!row)return place;
 const [price,hours]=row;
 const next={...place};
 if(!next.hours&&hours)next.hours=hours;
 if(!next.price&&price&&price!=='—')next.price=price;
 return next;
}
