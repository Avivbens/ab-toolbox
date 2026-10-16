import { unpackJs } from './packed-js.parser.js';
import { PACKED_PLAYER } from './packed-player.fixture.js';

describe('unpackJs', () => {
  it('returns the source a packer would have evaluated', () => {
    const html = `<html><script>${PACKED_PLAYER}</script></html>`;
    expect(unpackJs(html)).toBe('var player={file:"https://cdn.example/master.m3u8"};');
  });

  it('unpacks every packer on the page', () => {
    expect(unpackJs(`${PACKED_PLAYER};${PACKED_PLAYER}`).split('\n')).toHaveLength(2);
  });

  it('skips blocks that are not runnable packers', () => {
    expect(unpackJs('eval(function(p,a,c,k,e,d){ throw new Error("nope") }())')).toBe('');
    expect(unpackJs('eval(function(p,a,c,k,e,d){ unterminated')).toBe('');
    expect(unpackJs('<p>no scripts here</p>')).toBe('');
  });
});
