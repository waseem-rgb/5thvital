# Admin Panel — Realtime Orders Setup

## What's already done (Supabase side)

1. `public.bookings` table is added to the `supabase_realtime` publication.
2. Tracking columns added: `status`, `report_url`, `phlebotomist_id`.
3. `public.phlebotomists` table created for assigned collection agents.
4. Customer-facing order tracking page (`/order/:orderId`) already subscribes to realtime updates.

## How to add realtime to the admin panel (5thvital-admin)

### 1. Subscribe to new bookings in the admin dashboard

In your admin dashboard page (e.g., `app/(dashboard)/page.tsx`), add a Supabase realtime subscription:

```tsx
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// Inside your component:
useEffect(() => {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const channel = supabase
    .channel('admin-bookings')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bookings' },
      (payload) => {
        // Show a toast or play a sound for new bookings
        console.log('New booking:', payload.new)
        // Refresh your bookings list here
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookings' },
      (payload) => {
        console.log('Booking updated:', payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

### 2. Update booking status from admin

To update a booking's status (which the customer sees in realtime on `/order/:orderId`):

```tsx
const updateBookingStatus = async (bookingId: string, status: string) => {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)

  if (error) console.error('Failed to update status:', error)
}
```

Valid status values for the customer-facing stepper:
- `confirmed` (default on creation)
- `phlebotomist_assigned`
- `sample_collected`
- `processing`
- `report_ready`

### 3. Assign a phlebotomist

```tsx
const assignPhlebotomist = async (bookingId: string, phlebotomistId: string) => {
  const { error } = await supabase
    .from('bookings')
    .update({
      phlebotomist_id: phlebotomistId,
      status: 'phlebotomist_assigned'
    })
    .eq('id', bookingId)
}
```

### 4. Upload report URL

```tsx
const uploadReport = async (bookingId: string, reportUrl: string) => {
  const { error } = await supabase
    .from('bookings')
    .update({
      report_url: reportUrl,
      status: 'report_ready'
    })
    .eq('id', bookingId)
}
```

## Supabase Dashboard verification

1. Go to Supabase Dashboard → Database → Replication
2. Confirm `bookings` appears under the `supabase_realtime` publication
3. If missing, run: `ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;`
