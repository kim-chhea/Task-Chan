<?php

namespace App\Console;

use Illuminate\Foundation\Console\ServeCommand as BaseServeCommand;

class ServeCommand extends BaseServeCommand
{
    /**
     * The request worker is a child process. `php -c` on the Artisan parent does not
     * reach it, so pass php.ini here. That is what raises the 2M upload limit.
     *
     * @return array<int, string>
     */
    protected function serverCommand()
    {
        $command = parent::serverCommand();

        array_splice($command, 1, 0, ['-c', base_path('php.ini')]);

        return $command;
    }
}
