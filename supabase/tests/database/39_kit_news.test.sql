begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

-- Kit news: headlines stored by the edge function (service role), matched to
-- the library's club and kit, read by everyone through latest_news.
select plan(8);

select is(store_news('[
  {"url": "https://www.soccerbible.com/performance/football-apparel/2084/10/young-boys-women-third/", "title": "Young Boys Women Receive Their First-Ever Exclusive Third Shirt From Nike", "published_on": "2026-10-01", "excerpt": "A first for YB Women."},
  {"url": "https://www.soccerbible.com/performance/football-apparel/2084/10/bromma-jordan/", "title": "Swedish Side Bromma Make History With New Special Edition Jordan Kit", "published_on": "2026-10-01"}
]'::jsonb), 2, 'headlines are stored');
select is((select club_id from news_items where url like '%young-boys-women-third/'), 'young-boys', 'the club is found by its short name');
select is((select k.variant || ' ' || k.kind || ' ' || k.season from news_items n join kits k on k.id = n.kit_id where n.url like '%young-boys-women-third/'), 'Women third 2026/27', 'and the kit the news is about');
select is((select club_id from news_items where url like '%bromma-jordan/'), null, 'Nike''s Jordan is not the national team');

select is(store_news('[{"url": "https://www.soccerbible.com/performance/football-apparel/2084/10/young-boys-women-third/", "title": "Young Boys Women Third", "published_on": "2026-10-01"}]'::jsonb), 1, 'a known headline is updated');

select is((select excerpt || ' / ' || kit_season from news_item((select id from news_items where url like '%young-boys-women-third/'))), 'A first for YB Women. / 2026/27', 'one item opens with its teaser and kit');

set local role anon;
select ok((select count(*) from latest_news(5) where url like '%2084/10%') >= 1, 'visitors read the news');
select throws_ok($$select store_news('[]'::jsonb)$$, '42501', null, 'but cannot write it');
reset role;

select * from finish();
rollback;
