import sitemap from './sitemap';

describe('sitemap', () => {
  it('includes marketing routes', () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toContain('https://www.schnittwerk-vanessa.ch/');
    expect(urls).toContain('https://www.schnittwerk-vanessa.ch/services');
  });
});
