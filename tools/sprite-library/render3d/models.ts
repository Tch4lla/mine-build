/** Registry of 3D models, keyed by the reference ID used in the sprite library. */
import type * as THREE from 'three';
import * as farm from './farm';
import * as people from './people';
import { rabbit } from './rabbit';
import * as v from './vehicles';
import * as water from './water';
import * as wild from './wild';

export const MODELS: Record<string, () => THREE.Object3D> = {
  player: people.player,
  chicken: farm.chicken,
  pig: farm.pig,
  cow: farm.cow,
  sheep: farm.sheep,
  goat: farm.goat,
  horse: () => farm.equine('#9a6a44', '#4a3424'),
  donkey: () => farm.equine('#8f8a80', '#5a5652', true, '#d9d0bc'),
  mule: () => farm.equine('#7a5438', '#3a2a22', true, '#c8a888'),
  llama: farm.llama,
  camel: farm.camel,
  armadillo: wild.armadillo,
  rabbit,
  fox: wild.fox,
  ocelot: () => wild.feline('#e8c45a', '#6a4a2a', true),
  cat: () => wild.feline('#a9a59c', '#6a6660'),
  wolf: wild.wolf,
  polar_bear: () => wild.bear(),
  panda: () => wild.bear('#f6f1e6', true),
  turtle: wild.turtle,
  frog: wild.frog,
  tadpole: water.tadpole,
  axolotl: wild.axolotl,
  dolphin: water.dolphin,
  cod: () => water.fish('#b8a888'),
  salmon: () => water.fish('#d0705a'),
  tropical_fish: () => water.fish('#e8903a', '#f2ece0', 0.85),
  pufferfish: water.pufferfish,
  nautilus: water.nautilus,
  squid: water.squid,
  bee: water.bee,
  parrot: water.parrot,
  bat: water.bat,
  slime: people.puffball,
  zombie: people.zombie,
  skeleton: people.skeleton,
  spider: people.spider,
  witch: people.witch,
  snow_golem: people.snowman,
  armor_stand: v.armourStand,
  item_frame: v.itemFrame,
  minecart: () => v.cart(),
  chest_minecart: () => v.cart('chest'),
  furnace_minecart: () => v.cart('furnace'),
  tnt_minecart: () => v.cart('blast'),
  bamboo_raft: () => v.raft(),
  bamboo_chest_raft: () => v.raft(true),
};
for (const w of ['oak', 'birch', 'spruce', 'jungle', 'dark_oak', 'acacia', 'mangrove', 'cherry']) {
  MODELS[`${w}_boat`] = () => v.boat(w);
  MODELS[`${w}_chest_boat`] = () => v.boat(w, true);
}
