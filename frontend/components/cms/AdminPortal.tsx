'use client';
import BusinessPortal from '../business/BusinessPortal';
export default function AdminPortal({mode}:{mode:'client'|'super'}){return <BusinessPortal mode={mode}/>;}
