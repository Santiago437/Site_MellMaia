insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('products','products',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
create policy product_images_read on storage.objects for select to anon,authenticated using(bucket_id='products');
create policy product_images_upload on storage.objects for insert to authenticated with check(bucket_id='products' and private.is_owner() and name ~ '^[a-f0-9-]+\.(jpg|png|webp)$');
-- No overwrite or delete grants: old product image URLs remain stable.
