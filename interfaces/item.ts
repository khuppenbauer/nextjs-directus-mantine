import type Link from './link';

type ItemType = {
  id: string;
  type?: string;
  layout?: string;
  title?: string;
  text?: string;
  image?: string;
  links?: Link[];
};

export default ItemType;
