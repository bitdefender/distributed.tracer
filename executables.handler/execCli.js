const program = require('commander');
const execHandler = require('./index.js');

function list(val) {
	return val.split(',');
}

program
	.option('--start-services', 'Start services')
	.option('--stop-services <services>', 'Stop services', list)
	.option('--id <id>', 'Executable id')
	.allowUnknownOption()
	.parse(process.argv);

if (program.startServices) {
	execHandler.StartServices();
} else if (program.stopServices) {
	execHandler.StartServices(program.stopServices);
} else {
	execHandler.EnqueueID(program.id);
}
