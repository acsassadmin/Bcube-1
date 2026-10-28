-- Add razorpay_order_id column to orders table
ALTER TABLE public.orders
ADD COLUMN razorpay_order_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS orders_razorpay_order_id_idx ON public.orders(razorpay_order_id);
