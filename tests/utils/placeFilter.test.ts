import { placesFileSuffix, placesLabel, placesOrFilter } from '../../src/utils/placeFilter';

describe('placesOrFilter', () => {
  it('matches each city together with its province', () => {
    expect(placesOrFilter([{ city: 'Lucban', province: 'Quezon' }, { city: 'Calamba', province: 'Laguna' }]))
      .toBe('and(city.eq."Lucban",province.eq."Quezon"),and(city.eq."Calamba",province.eq."Laguna")');
  });

  it('quotes names with PostgREST-reserved characters', () => {
    expect(placesOrFilter([{ city: 'Sto. Tomas', province: 'Batangas' }])).toBe('and(city.eq."Sto. Tomas",province.eq."Batangas")');
    expect(placesOrFilter([{ city: 'A "B", C', province: 'D\\E' }])).toBe('and(city.eq."A \\"B\\", C",province.eq."D\\\\E")');
  });
});

describe('placesLabel / placesFileSuffix', () => {
  it('describes the selection', () => {
    expect(placesLabel([])).toBe('All locations');
    expect(placesLabel([{ city: 'Lucban', province: 'Quezon' }])).toBe('Lucban');
    expect(placesLabel([{ city: 'a', province: 'b' }, { city: 'c', province: 'd' }])).toBe('2 locations');
  });

  it('builds a file-safe suffix', () => {
    expect(placesFileSuffix([])).toBe('');
    expect(placesFileSuffix([{ city: 'Science City of Muñoz', province: 'Nueva Ecija' }])).toBe('_science-city-of-munoz');
    expect(placesFileSuffix([{ city: 'a', province: 'b' }, { city: 'c', province: 'd' }])).toBe('_2-locations');
  });
});
