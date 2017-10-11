import { InterfacePage } from './app.po';

describe('interface App', function() {
  let page: InterfacePage;

  beforeEach(() => {
    page = new InterfacePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
