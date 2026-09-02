# Engagement event contract

Perigee records only typed product events and active elapsed time. The adapter
has no provider by default, keeps development events in memory for inspection,
and swallows provider failures so analytics can never delay the scene.

Events cover scene readiness, first interaction, object, distance and viewpoint
changes, featured-encounter opens and selections, encounter start/beat/exit/
complete, discovery opens, capture, and share outcomes. Properties contain only
catalogue identifiers, editorial month, placement, beat indexes, outcomes, and
load duration. They must never contain free-form text, precise location, or a
persistent visitor identifier.

Active time stops when the document is hidden and after 60 seconds without an
interaction. Production measurement uses Umami through the provider-neutral
adapter. Revisit privacy, consent, static hosting, data ownership, and cost
before changing providers or expanding the event contract.
