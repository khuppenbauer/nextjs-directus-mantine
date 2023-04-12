import { NextApiResponse, NextApiRequest } from 'next';
import getConfig from 'next/config';
import { getDirectusClient } from '../../lib/directus';

const {
  publicRuntimeConfig: { prefix },
} = getConfig();

const migrateCollection = async (data: any) => {
  const { from, to, name, group } = data;
  const collectionName = `${from}_${name}`;
  console.log(collectionName);
  const directus = await getDirectusClient();
  const collection = await directus.collections.readOne(collectionName);
  const { meta, schema } = collection;
  const fields = await directus.fields.readMany(collectionName);
  const newCollectionName = `${to}_${name}`;

  const newFields = fields.data.map((field) => {
    const { meta } = field;
    delete meta.id;
    const newMeta = meta;
    if (meta.interface === 'file-image') {
      newMeta.options = null;
    }
    const newField = {
      ...field,
      collection: newCollectionName,
      meta: newMeta,
    };
    return newField;
  });
  const newCollection = {
    ...collection,
    collection: newCollectionName,
    meta: {
      ...meta,
      collection: newCollectionName,
      group,
    },
    schema: {
      ...schema,
      name: newCollectionName,
    },
    fields: newFields,
  };
  const json = JSON.stringify(newCollection).replaceAll(from, to);
  const res = JSON.parse(json);
  const result = await directus.collections.createOne(res);

  const relations = await directus.relations.readAll();
  await relations.reduce(async (lastPromise, relation) => {
    const accum = await lastPromise;
    const { collection } = relation;
    if (collection.includes(from)) {
      const { meta } = relation;
      delete meta.id;
      const newMeta = meta;
      const newRelation = {
        ...relation,
        meta: newMeta,
      };
      const json = JSON.stringify(newRelation).replaceAll(from, to);
      const res = JSON.parse(json);
      try {
        const result = await directus.relations.createOne(res);
      } catch (e) {}
    }
    return [...accum, {}];
  }, Promise.resolve([]));
};

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const { method, body } = _req;
  if (method === 'POST') {
    const res = await migrateCollection(body);
  }
  res.setHeader('Access-Control-Allow-Origin', ['*']);
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).json({
    message: 'Ok',
  });
}
