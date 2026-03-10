'use client'

import React from 'react'
import Link from 'next/link'
import { IdCard, ListOrdered, NotebookTabs } from 'lucide-react'

export default function Sidebar() {
  return (
    <div className="flex flex-col gap-4 mt-16">
      <div className="flex gap-4 hover:bg-[#215F9A] hover:text-white p-2 rounded-lg cursor-pointer">
        <ListOrdered />
        <Link href="/orders">Orders</Link>
      </div>
      <div className="flex gap-4 hover:bg-[#215F9A] hover:text-white p-2 rounded-lg cursor-pointer">
        <NotebookTabs />
        <Link href="/numbers">Numbers</Link>
      </div>
      <div className="flex gap-4 hover:bg-[#215F9A] hover:text-white p-2 rounded-lg cursor-pointer">
        <IdCard />
        <Link href="/port-in">Order Port-in</Link>
      </div>
      <div className="flex gap-4 hover:bg-[#215F9A] hover:text-white p-2 rounded-lg cursor-pointer">
        <NotebookTabs />
        <Link href="/port-out">Order Port-out</Link>
      </div>
    </div>
  )
}

