# Licensing

ACGSBot is open source under the [Apache License 2.0](LICENSE).

ACGSBot is a modified version of OpenMausBot, Copyright 2026 Milind Soni and
OpenMausBot contributors, also licensed under the Apache License 2.0. The
upstream copyright and attribution notices are kept in [NOTICE](NOTICE) and in
the source files as section 4 of the license requires. Files changed for
ACGSBot carry those changes in this repository's git history.

## Open-source edition only

The upstream `enterprise/` folder is source-available under a separate
license that does not allow white-labelling. It is not part of ACGSBot. With
it removed, the server reports `{"edition":"oss"}`; the
`open-source edition builds without enterprise/` CI job checks that build.

## Trademarks

The OpenMausBot and MausBot names and the mascot are trademarks of Supamaus
Software Private Limited. The Apache License grants no trademark rights
(section 6), so ACGSBot uses its own name. ACGSBot is not affiliated with or
endorsed by OpenMausBot or Supamaus Software Private Limited.

## Third-party components

Bundled third-party software keeps its own licenses. Notices, license texts,
source locations and the SBOM are listed in [NOTICE](NOTICE) and
[`third_party/`](third_party/).

## Contributions

Contributions are accepted under the Apache License 2.0. Submit only code you
wrote or have the right to contribute.
