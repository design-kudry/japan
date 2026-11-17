import TripSegmentedControl from './trip-segmented-control.jsx';
import {useState} from 'react';
import {Button, Checkbox, DropdownMenu, Icon, SegmentedRadioGroup, TextInput} from '@gravity-ui/uikit';
import {EllipsisVertical, Plus, ShoppingBag, Xmark} from '@gravity-ui/icons';
import FloatingAction from './floating-action.jsx';

const people = ['Вика','Женя'];
const categories = {
  'Покупки':['🛍️','#27c985'], 'Рестораны и бары':['🍔','#12d5c1'],
  'Транспорт':['🚕','#e31587'], 'Продукты':['🛒','#7939ec'],
  'Другое':['✋','#229fae'], 'Без категории':['❔','#b4b4bc'],
  'Развлечения':['🎤','#fa3154'],
};
const fromScreenshot = [
  ['2026-10-01','Коктейль',522,'Продукты'],
  ['2026-09-30','Сендвич',429,'Продукты'],
  ['2026-09-30','Вода и карандаши',487,'Продукты'],
  ['2026-09-30','Серьги',770,'Покупки'],
  ['2026-09-30','Музеи',1000,'Развлечения'],
  ['2026-09-30','Обэд',1500,'Рестораны и бары'],
].map(([date,name,amount,category],id) => ({id,date,name,amount,category,payer:people[0],split:[]}));
const fmt = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
const money = value => fmt.format(value)+' ¥';
const sum = entries => entries.reduce((total,entry) => total+entry.amount,0);
const dateFormat = new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',timeZone:'UTC'});
const dayLabel = date => dateFormat.format(new Date(date+'T00:00:00Z'));
const debit = value => '− '+money(value);
const localDate = () => {
  const date = new Date();
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
};
const tabs = [['list','Расходы'],['balance','Кошелек'],['chart','График']].map(([value,content]) => ({value,content}));

function ExpenseForm({onClose,onSave}) {
  const [split,setSplit] = useState(people);
  const [error,setError] = useState('');
  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('name').trim();
    const amount = Number(data.get('amount'));
    if (!name || !Number.isSafeInteger(amount) || amount <= 0 || !split.length) {
      setError('Укажи название, сумму в иенах и участников.');return;
    }
    if (!onSave({id:crypto.randomUUID(),name,amount,date:data.get('date'),category:data.get('category'),payer:data.get('payer'),split})) {
      setError('Не удалось сохранить расход.');
    }
  }
  return <form className="expense-form" onSubmit={submit}>
    <div className="expense-toolbar">
      <Button view="normal" size="l" aria-label="Закрыть" onClick={onClose}><Icon data={Xmark} size={18}/></Button>
      <h1>Добавить расход</h1>
    </div>
    <label>Заголовок<TextInput name="name" size="xl" required placeholder="Например, напитки" /></label>
    <label>Сумма, ¥<TextInput name="amount" size="xl" type="number" min="1" step="1" required placeholder="0" /></label>
    <div className="expense-fields">
      <label>Оплачено<select name="payer">{people.map(person => <option key={person}>{person}</option>)}</select></label>
      <label>Когда<input type="date" name="date" required defaultValue={localDate()}/></label>
    </div>
    <label>Категория<select name="category" defaultValue="Без категории">{Object.keys(categories).map(category => <option key={category}>{category}</option>)}</select></label>
    <fieldset><legend>Разделить поровну</legend>{people.map(person => <Checkbox key={person}
      checked={split.includes(person)} onUpdate={checked => setSplit(previous => checked ? [...previous,person] : previous.filter(item => item !== person))}>{person}</Checkbox>)}</fieldset>
    {error && <p role="alert">{error}</p>}
    <Button type="submit" view="action" size="xl" width="max">Добавить</Button>
  </form>;
}

function ExpenseChart({entries}) {
  const [period,setPeriod] = useState('all');
  const months = [...new Set(entries.map(entry => entry.date.slice(0,7)))];
  const years = [...new Set(months.map(month => month.slice(0,4)))];
  const [month,setMonth] = useState('');
  const [year,setYear] = useState('');
  const prefix = period === 'month' ? (month || months[0]) : (year || years[0]);
  const filtered = period === 'all' ? entries : entries.filter(entry => entry.date.startsWith(prefix));
  const total = sum(filtered);
  const breakdown = Object.entries(categories).map(([name,[icon,color]]) => ({
    name,icon,color,value:sum(filtered.filter(entry => entry.category === name)),
  })).filter(item => item.value).sort((a,b) => b.value-a.value);
  let angle = 0;
  const gradient = breakdown.map(({color,value}) => {
    const start = angle;
    angle += 100*value/total;
    return color+' '+start+'% '+Math.min(angle,100)+'%';
  });
  return <div className="expense-chart-view">
    <TripSegmentedControl size="l" width="max" value={period} onUpdate={setPeriod} options={[
      {value:'month',content:'Месяц'},{value:'year',content:'Год'},{value:'all',content:'Всё'},
    ]}/>
    {period !== 'all' && prefix && <select aria-label="Период" value={prefix}
      onChange={event => (period === 'month' ? setMonth : setYear)(event.target.value)}>
      {(period === 'month' ? months : years).map(value => <option key={value} value={value}>{period === 'month'
        ? new Intl.DateTimeFormat('ru',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T00:00:00Z')) : value}</option>)}
    </select>}
    <div className="expense-chart">
      <div className="expense-pie" aria-hidden="true" style={total ? {background:'conic-gradient('+gradient.join(',')+')'} : undefined}/>
      <div><strong>Итого · {money(total)}</strong>
        <ul>{breakdown.map(({name,color}) => <li key={name}><i style={{background:color}} />{name}</li>)}</ul>
      </div>
    </div>
    {breakdown.length > 0 && <div className="expense-breakdown">{breakdown.map(({name,icon,value}) =>
      <div key={name}><span>{icon} {name}</span><strong>{money(value)}</strong></div>)}</div>}
  </div>;
}

export default function TripExpenses({tripKey,planned}) {
  const key = 'trip-expenses:'+tripKey;
  const [entries,setEntries] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(stored)) return stored;
    } catch {}
    return tripKey === '#japan' ? fromScreenshot : [];
  });
  const [tab,setTab] = useState('list');
  const [adding,setAdding] = useState(false);
  const [search,setSearch] = useState(false);
  const [query,setQuery] = useState('');
  const [showPlan,setShowPlan] = useState(false);
  const sorted = [...entries].sort((a,b) => b.date.localeCompare(a.date));
  const visible = sorted.filter(entry => entry.name.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')));
  const dates = [...new Set(visible.map(entry => entry.date))];
  const balances = people.map(person => entries.reduce((net,entry) => {
    if (!entry.split.length) return net;
    return net+(entry.payer === person ? entry.amount : 0)-(entry.split.includes(person) ? entry.amount/entry.split.length : 0);
  },0));
  if (adding) return <section className="expense-page"><ExpenseForm onClose={() => setAdding(false)} onSave={entry => {
    const next = [entry,...entries];
    try {localStorage.setItem(key,JSON.stringify(next));} catch {return false;}
    setEntries(next);setQuery('');setSearch(false);setTab('list');setAdding(false);window.scrollTo(0,0);return true;
  }}/></section>;
  return <section className="expense-page">
    <header className="expense-toolbar">
      <h1>Расходы</h1>
      <DropdownMenu items={[
        {text:'Поиск расходов',action:() => {setTab('list');setSearch(!search);setQuery('');}},
        ...(planned.length ? [{text:'Плановые расходы',action:() => {setTab('list');setShowPlan(!showPlan);}}] : []),
      ]} renderSwitcher={props => <Button {...props} view="flat" size="l" aria-label="Действия с расходами">
        <Icon data={EllipsisVertical} size={16}/>
      </Button>}/>
    </header>
    <TripSegmentedControl size="l" width="max" value={tab} onUpdate={setTab} options={tabs}/>
    {tab === 'list' && <>
      {search && <TextInput autoFocus placeholder="Поиск расходов" aria-label="Поиск расходов" value={query} onUpdate={setQuery}/>}
      <div className="expense-totals">
        <div><strong>{fmt.format(sum(entries.filter(entry => entry.payer === people[0])))}</strong><span>Мои расходы</span></div>
        <div><strong>{fmt.format(sum(entries))}</strong><span>Общие расходы</span></div>
      </div>
      {dates.map(date => {
        const dayEntries = visible.filter(entry => entry.date === date);
        return <section className="expense-day" key={date}>
          <header className="expense-day-heading"><h2>{dayLabel(date)}</h2><span>{debit(sum(dayEntries))}</span></header>
          <div className="expense-day-entries">{dayEntries.map(entry => <div className="expense-entry" key={entry.id}>
            <span className="expense-entry-icon" aria-hidden="true"><Icon data={ShoppingBag} size={18}/></span>
            <div className="expense-entry-name">{entry.name}<small>{entry.payer}</small></div>
            <strong>{debit(entry.amount)}</strong>
          </div>)}</div>
        </section>;
      })}
      {!dates.length && <p>{query ? 'Ничего не найдено' : 'Пока нет расходов'}</p>}
      {showPlan && <section className="expense-plan"><h2>Плановые расходы</h2>
        {planned.map(group => <section key={group.cat}><h3>{group.cat}</h3>
          {group.items.map(item => <div key={item.name}><span>{item.name}</span><strong>{item.jpy}</strong></div>)}
        </section>)}
      </section>}
    </>}
    <FloatingAction icon={Plus} label="Добавить расход" onClick={() => {
      setAdding(true);
      document.getElementById('trips')?.scrollTo(0,0);
    }}/>
    {tab === 'balance' && <div className="expense-breakdown">{people.map((person,index) => {
      const balance = balances[index];
      return <div key={person}><span>{person}{index === 0 ? ' (я)' : ''}</span>
        <strong className={balance > 0 ? 'expense-positive' : balance < 0 ? 'expense-negative' : undefined}>
          {balance > 0 ? '+' : balance < 0 ? '−' : ''}{money(Math.abs(balance))}
        </strong></div>;
    })}</div>}
    {tab === 'chart' && <ExpenseChart entries={sorted}/>}
  </section>;
}
