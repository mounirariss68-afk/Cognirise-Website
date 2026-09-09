UPDATE "cms_market_editions" AS edition
   SET "publication_state" = 'archived'
  FROM "cms_documents" AS document
 WHERE edition."document_id" = document."id"
   AND document."status" = 'archived'
   AND edition."publication_state" <> 'archived';

UPDATE "cms_documents"
   SET "status" = 'active'
 WHERE "status" = 'archived';