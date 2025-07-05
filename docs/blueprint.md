# **App Name**: LEPA'S PDV

## Core Features:

- Authentication: Authentication: Implement login using email and password.
- Dashboard: Dashboard: Display key performance indicators (KPIs) aggregated from Firestore data.
- Active Children: Active Children: Render cards of active children with timers, listening to the 'atendimentos_ativos' collection for real-time updates. Alerts when reaching maximum allowance
- Point of Sale: Point of Sale (PDV): Process sales, updating Firestore with the new sale, deleting active children records, and managing product stock, using WriteBatch for atomic operations.
- Reports: Reports: Display sales reports based on date and category filters using data fetched from the 'vendas' collection.
- Settings: Settings: Manage products, coupons, and general settings through CRUD operations in Firestore.  Upload and manage the company logo via Cloud Storage.

## Style Guidelines:

- Primary color: HSL(40, 100%, 50%) - A vibrant gold (#FFC800) to evoke a sense of fun, energy, and playful sophistication suitable for a children's park environment.
- Background color: HSL(40, 20%, 95%) - Very light pastel yellow (#F5F3EB), providing a soft, inviting backdrop that complements the vibrant primary color.
- Accent color: HSL(10, 80%, 55%) - A bright coral (#E6734D) for interactive elements, drawing attention and adding a playful touch that contrasts well with the gold.
- Font pairing: 'Poppins' (sans-serif) for headlines and 'PT Sans' (sans-serif) for body text. 'Source Code Pro' for displaying code snippets.
- Lucide React icon set will provide a consistent and modern look across the application, ensuring ease of use.
- Responsive layout design, using Tailwind CSS to ensure the application is usable on various screen sizes within the desktop environment.
- Framer Motion animations used subtly to enhance user experience during transitions, form submissions, and data updates.