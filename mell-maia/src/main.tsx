import React,{useState,useEffect,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import {X,CheckCircle,AlertCircle} from 'lucide-react';
import {initialData} from './data';
import {isDemo,loadData,supabase} from './lib';
import type {Data} from './types';
import {Storefront} from './storefront';
import {Admin} from './admin';
import './styles.css';
export function Brand({light=false}:{light?:boolean}){return <a href="/" className={`brand ${light?'light':''}`} aria-label="Mell Maia Calçados, início"><span className="brand-logo"><img src="/images/logo-original.jpeg" alt=""/></span><span><strong>MELL MAIA</strong><small>CALÇADOS</small></span></a>;}
export function Modal({title,children,onClose,wide=false}:{title:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}){const closeRef=React.useRef(onClose);closeRef.current=onClose;const ref=React.useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current!;d.showModal();const fn=(e:Event)=>{e.preventDefault();closeRef.current();};d.addEventListener('cancel',fn);return()=>{d.removeEventListener('cancel',fn);d.close();};},[]);return <dialog ref={ref} className={wide?'modal wide':'modal'} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-head"><h2>{title}</h2><button className="icon-btn" aria-label="Fechar" onClick={onClose}><X/></button></div>{children}</dialog>;}
function App(){
 const [data,setData]=useState<Data>(()=>{if(!isDemo)return {stores:[],products:[],variants:[],orders:[],members:[]};try{const d=JSON.parse(localStorage.getItem('mell-demo-v1')||'null');return d&&Array.isArray(d.products)&&Array.isArray(d.variants)&&Array.isArray(d.orders)?d:initialData();}catch{return initialData();}});
 const [loading,setLoading]=useState(!isDemo),[error,setError]=useState(''),[toast,setToast]=useState('');const admin=location.pathname.startsWith('/admin');
 const notify=useCallback((m:string)=>setToast(m),[]);
 const refresh=useCallback(async()=>{if(isDemo)return;setLoading(true);try{const {data:{user}}=await supabase!.auth.getUser();setData(await loadData(admin&&!!user));setError('');}catch{setError('Não foi possível carregar os dados. Verifique a conexão e a configuração do Supabase.');}finally{setLoading(false);}},[admin]);
 useEffect(()=>{refresh();if(!supabase)return;const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(refresh,0);});return()=>subscription.unsubscribe();},[refresh]);
 useEffect(()=>{if(isDemo)try{localStorage.setItem('mell-demo-v1',JSON.stringify(data));}catch{/* private mode */}},[data]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(t);},[toast]);
 if(error)return <main className="error-screen"><AlertCircle size={40}/><h1>Vamos tentar novamente?</h1><p>{error}</p><button className="btn" onClick={refresh}>Recarregar</button></main>;
 if(loading)return <main className="error-screen"><Brand/><div className="spinner"/><p>Preparando a Mell Maia para você…</p></main>;
 return <>{admin?<Admin data={data} setData={setData} refresh={refresh} notify={notify}/>:<Storefront data={data} notify={notify}/>}<div className="toast-area" role="status" aria-live="polite">{toast&&<div className="toast"><CheckCircle size={18}/>{toast}<button className="icon-btn" aria-label="Dispensar aviso" onClick={()=>setToast('')}><X size={16}/></button></div>}</div></>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
