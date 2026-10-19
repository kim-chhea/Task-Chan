<?php

it('describes the API at the root', function () {
    $this->getJson('/')->assertOk()->assertJsonStructure(['name', 'api']);
});
