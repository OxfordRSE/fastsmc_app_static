This folder contains the UK Biobank postcode matrices described in the FastSMC paper. They can be visualized in the online interactive map (see FastSMC paper).

The matrices are in npy (NumPy array) format. The mapping between postcodes and rows / columns of the matrices is provided in the postcodeMapping_postcodeMatrices.txt file.

The format of the file names is as follows:
"matrix_len_" for IBD sharing across and within UK postcodes in centimorgans; "matrix_nb_" for the number of IBD segments accross and within UK postcodes;
the following number in the file name corresponds to the time threshold for IBD sharing;
"_lower_95.npy" for the 95% CI lower bound; "_upper_95.npy" for the 95% CI upper bound; "_mean.npy" for the mean.
