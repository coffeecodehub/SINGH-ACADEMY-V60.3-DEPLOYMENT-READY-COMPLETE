'use client';
import {useEffect,useState} from 'react';
import {apiFetch} from '../../lib/api';
import RecordsTable,{Action,availableActions} from './RecordsTable';
import {Dialog,Row,Notice,Loading,Badge,day,stamp,money,ActionSelect,Empty} from './ui';
export default function CustomerDialog({id,revision,onClose,onAction}:{id:string;revision:number;onClose:()=>void;onAction:(a:Action)=>void}){
 const [data,setData]=useState<Row|null>(null),[error,setError]=useState(''),[tab,setTab]=useState('Overview');
 useEffect(()=>{const c=new AbortController();setError('');apiFetch('/business/customers/'+id,{signal:c.signal}).then(setData).catch((e:any)=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[id,revision]);
 const user=data?.user;
 const tabs=['Overview','Subscriptions','Invoices','Payments','Refunds','Enrollments','Activity'];
 function action(a:Action){onAction(a);}
 return <Dialog title="Customer profile" subtitle="Student account · billing history · learning access" onClose={onClose} wide>
 {error?<Notice error>{error}</Notice>:!data?<Loading/>:<>
 <div className="bizCustomerTop"><div className="bizCustomerIdentity"><span className="bizAvatar">{(user?.name||'S')[0]}</span><div><h3>{user?.name}</h3><p>{user?.email}</p><Badge value={user?.status||'active'}/></div></div><ActionSelect label="Customer actions" items={availableActions('users',user).filter(x=>x.value!=='profile')} onChoose={kind=>action({kind,row:user})}/></div>
 <div className="bizCustomerMeta"><div><span>Signed up</span><b>{stamp(user?.createdAt)}</b></div><div><span>Last successful sign-in</span><b>{stamp(user?.lastLoginAt)}</b></div><div><span>Tracked sign-ins</span><b>{user?.loginCount??0} · tracking from V45</b></div><div><span>Phone</span><b>{user?.phone||'Not provided'}</b></div><div><span>Country</span><b>{user?.country||'Not provided'}</b></div><div><span>Email status</span><b>{user?.emailVerified?'Marked verified':'Not verified'}</b></div></div>
 {data.historyTruncated&&<Notice>This profile shows the latest 100 records per billing section and 40 activity entries. Use the main searchable lists and exports for longer histories.</Notice>}
 <nav className="bizTabs" aria-label="Customer detail sections">{tabs.map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)} aria-current={tab===t?'page':undefined}>{t}{t!=='Overview'&&` (${data[t.toLowerCase()]?.length||0})`}</button>)}</nav>
 {tab==='Overview'?<><div className="bizPanel"><div className="bizPanelHead"><div><h2>Lifetime recorded collections</h2><p>Gross less recorded refunds, grouped by currency. Not accounting profit.</p></div></div>{data.totals.length?<div className="bizPanelBody">{data.totals.map((t:Row)=><div className="bizSummaryRow" key={t._id}><span>{t._id} · gross {money(t.grossMinor,t._id)} · refunds {money(t.refundMinor,t._id)}</span><b>Net {money(t.netMinor,t._id)}</b></div>)}</div>:<Empty title="No recognized collections" description="Unpaid invoices and free access do not count as revenue."/>}</div><div className="bizPanel"><div className="bizPanelHead"><div><h2>Membership dates & renewal dues</h2><p>Access expiry and payment due dates are tracked separately.</p></div></div><RecordsTable kind="subscriptions" rows={data.subscriptions.slice(0,5).map((r:Row)=>({...r,user}))} onCustomer={()=>{}} onAction={action}/></div><div className="bizPanelBody"><h3>Internal notes</h3><p style={{whiteSpace:'pre-wrap'}}>{user?.adminNotes||'No internal notes recorded.'}</p>{user?.status==='blocked'&&<Notice error>Account blocked: {user.blockedReason||'See activity history.'}</Notice>}</div><p className="bizSectionNote">Lesson completion is an engagement indicator, not proof of assessment success. Membership-only progress outside directly assigned courses is not included in this profile’s enrollment view.</p></>:<RecordsTable kind={tab.toLowerCase()} rows={(data[tab.toLowerCase()]||[]).map((r:Row)=>({...r,user}))} onCustomer={()=>setTab('Overview')} onAction={tab==='Activity'?undefined:action}/>}
 </>}
 </Dialog>;
}
