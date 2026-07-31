-- Ponto de foco (enquadramento) de cada foto da galeria — usado como
-- object-position nos crops de proporção fixa (grade da galeria, admin e
-- público). Percentual 0-100, default 50/50 = centro (comportamento atual
-- sem alteração até o casal escolher um ponto diferente).

alter table photos
  add column focal_x smallint not null default 50 check (focal_x between 0 and 100),
  add column focal_y smallint not null default 50 check (focal_y between 0 and 100);

comment on column photos.focal_x is
  'Ponto de foco horizontal (0-100%), aplicado como object-position em crops de proporção fixa. Default 50 = centro.';
comment on column photos.focal_y is
  'Ponto de foco vertical (0-100%), aplicado como object-position em crops de proporção fixa. Default 50 = centro.';
